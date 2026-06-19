export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { name, email, phone, insuranceType, zipcode, additionalDetails } = req.body;

  // Validation
  if (!name || !email || !phone || !insuranceType || !zipcode) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is not defined');
    return res.status(500).json({ success: false, message: 'Server configuration error: API key missing' });
  }

  // Parse first name (capitalize first letter, lowercase the rest)
  const parts = name.trim().split(/\s+/);
  const rawFirstName = parts[0] || 'Client';
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase();

  try {
    const resendUrl = 'https://api.resend.com/emails';
    const resendHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Prepare Lead Notification Email (sent to Greg at info@gjsrs.com)
    const leadEmailPayload = {
      from: 'GJS Risk Solutions Website <gsmith@gjsrs.com>',
      to: ['info@gjsrs.com'],
      subject: `New Lead: ${name} - ${getInsuranceTypeLabel(insuranceType)}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #002868; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">New Quote Request Received</h2>
          </div>
          <div style="padding: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold; width: 35%;">Client Name:</td>
                <td style="padding: 10px 0;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Email Address:</td>
                <td style="padding: 10px 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Phone Number:</td>
                <td style="padding: 10px 0;"><a href="tel:${phone}">${phone}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Texas ZIP Code:</td>
                <td style="padding: 10px 0;">${zipcode}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Insurance Type:</td>
                <td style="padding: 10px 0;">${getInsuranceTypeLabel(insuranceType)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Additional Details:</td>
                <td style="padding: 10px 0; white-space: pre-wrap;">${additionalDetails || 'None provided'}</td>
              </tr>
            </table>
          </div>
          <div style="background-color: #f9f9f9; text-align: center; padding: 15px; font-size: 12px; color: #666; border-top: 1px solid #eee;">
            Sent from GJS Risk Solutions Website Lead Capture
          </div>
        </div>
      `
    };

    // 2. Prepare Autoresponder Email (sent to client)
    const autoresponsePayload = {
      from: 'Gregory J. Smith <gsmith@gjsrs.com>',
      to: [email],
      subject: getSubject(insuranceType),
      html: getHtmlBody(firstName, insuranceType)
    };

    // Send both emails in parallel via Resend API
    const [leadResponse, clientResponse] = await Promise.all([
      fetch(resendUrl, {
        method: 'POST',
        headers: resendHeaders,
        body: JSON.stringify(leadEmailPayload)
      }),
      fetch(resendUrl, {
        method: 'POST',
        headers: resendHeaders,
        body: JSON.stringify(autoresponsePayload)
      })
    ]);

    const leadData = await leadResponse.json();
    const clientData = await clientResponse.json();

    if (!leadResponse.ok) {
      console.error('Failed to send lead email:', leadData);
      throw new Error(leadData.message || 'Failed to send lead email');
    }

    if (!clientResponse.ok) {
      console.error('Failed to send client email:', clientData);
      throw new Error(clientData.message || 'Failed to send client email');
    }

    return res.status(200).json({ success: true, message: 'Emails sent successfully' });

  } catch (error) {
    console.error('Error sending email through Resend:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

function getInsuranceTypeLabel(type) {
  switch (type) {
    case 'auto': return 'Personal Auto';
    case 'home': return 'Homeowners';
    case 'business': return 'Business Insurance';
    case 'multiple': return 'Bundle & Save (Home & Auto)';
    default: return type;
  }
}

function getSubject(type) {
  switch (type) {
    case 'auto':
      return 'Your GJS Risk Solutions Auto Quote Request';
    case 'home':
      return 'Your GJS Risk Solutions Homeowners Quote Request';
    case 'multiple':
      return 'Your GJS Risk Solutions Bundle Quote Request';
    case 'business':
      return 'Your GJS Risk Solutions Business Quote Request';
    default:
      return 'Your GJS Risk Solutions Quote Request';
  }
}

function getHtmlBody(firstName, type) {
  let mainContent = '';
  switch (type) {
    case 'auto':
      mainContent = `<p>Thank you for the opportunity to review your insurance.</p>
      <p>Please reply to this email and complete the form below and return it along with copies of your current Declarations (Dec) pages for both Auto and Home.</p>
      
      <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; background-color: #fafbfd; margin: 25px 0; font-size: 13px; color: #475569; line-height: 1.6;">
        <h4 style="color: #002868; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">GENERAL CONTACT INFORMATION</h4>
        
        <p style="margin: 10px 0;"><strong>Named Insured #1 (First &amp; Last Name):</strong></p>
        <p style="margin: 10px 0;"><strong>Named Insured #2 (First &amp; Last Name):</strong></p>
        <p style="margin: 10px 0;"><strong>Home Address:</strong></p>
        <p style="margin: 10px 0;"><strong>Mailing Address (if different):</strong></p>
        <p style="margin: 10px 0;"><strong>How Long at current address?</strong></p>
        <p style="margin: 10px 0;"><strong>If less than 3 years, please provide previous address:</strong></p>
        <p style="margin: 10px 0;"><strong>Best Phone Number(s) for both Insureds:</strong></p>
        <p style="margin: 10px 0;"><strong>Email Address(es) for both Insureds:</strong></p>

        <h4 style="color: #002868; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">AUTO INSURANCE INFORMATION</h4>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">* Please attach a copy of your current Auto Declarations page from your current carrier (shows coverages/limits for "apples-to-apples" comparison).</p>
        
        <p style="margin: 10px 0;"><strong>Current Auto Insurance Company:</strong></p>
        <p style="margin: 10px 0;"><strong>How long with current carrier?</strong></p>
        <p style="margin: 10px 0;"><strong>Policy Renewal Date (if known):</strong></p>

        <h5 style="color: #002868; margin: 15px 0 10px 0; font-size: 13px;">Drivers</h5>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">List all drivers in the household:</p>
        
        <p style="margin: 10px 0;"><strong>Driver 1 – Full Name:</strong></p>
        <p style="margin: 6px 0 12px 20px;">Date of Birth:<br>Driver’s License Number &amp; State:<br>Occupation:</p>
        
        <p style="margin: 10px 0;"><strong>Driver 2 – Full Name:</strong></p>
        <p style="margin: 6px 0 12px 20px;">Date of Birth:<br>Driver’s License Number &amp; State:<br>Occupation:</p>
        
        <p style="margin: 10px 0;"><strong>Driver 3 – Full Name:</strong></p>
        <p style="margin: 6px 0 12px 20px;">Date of Birth:<br>Driver’s License Number &amp; State:<br>Occupation:</p>
        
        <p style="margin: 10px 0;"><strong>Additional drivers (if any):</strong></p>
        <p style="margin: 10px 0;"><strong>How many household drivers &amp; non-drivers total?</strong></p>
        <p style="margin: 6px 0 12px 20px;">Drivers:<br>Non-drivers:</p>

        <h5 style="color: #002868; margin: 20px 0 10px 0; font-size: 13px;">Vehicles &amp; Usage</h5>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">List each vehicle and how it is used:</p>
        
        <p style="margin: 10px 0;"><strong>Vehicle 1 – Year/Make/Model:</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Who primarily drives this vehicle?<br>
          One-way miles to work or school:<br>
          How many days per week for work/school use?<br>
          Pleasure / Business use (describe):<br>
          Date purchased:<br>
          Is there a lien or lease? (Yes/No)<br>
          If Yes, Lender/Lease Company Name &amp; Address:
        </p>

        <p style="margin: 15px 0 10px 0;"><strong>Vehicle 2 – Year/Make/Model:</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Who primarily drives this vehicle?<br>
          One-way miles to work or school:<br>
          How many days per week for work/school use?<br>
          Pleasure / Business use (describe):<br>
          Date purchased:<br>
          Is there a lien or lease? (Yes/No)<br>
          If Yes, Lender/Lease Company Name &amp; Address:
        </p>
        
        <p style="margin: 10px 0;"><strong>Additional vehicles (if any):</strong></p>
      </div>`;
      break;

    case 'home':
      mainContent = `<p>Thank you for the opportunity to review your insurance.</p>
      <p>Please reply to this email and complete the form below and return it along with copies of your current Declarations (Dec) pages for both Auto and Home.</p>
      
      <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; background-color: #fafbfd; margin: 25px 0; font-size: 13px; color: #475569; line-height: 1.6;">
        <h4 style="color: #002868; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">GENERAL CONTACT INFORMATION</h4>
        
        <p style="margin: 10px 0;"><strong>Named Insured #1 (First &amp; Last Name - Date of Birth - Occupation):</strong></p>
        <p style="margin: 10px 0;"><strong>Named Insured #2 (First &amp; Last Name - Date of Birth - Occupation):</strong></p>
        <p style="margin: 10px 0;"><strong>Home Address:</strong></p>
        <p style="margin: 10px 0;"><strong>Mailing Address (if different):</strong></p>
        <p style="margin: 10px 0;"><strong>How Long at current address?</strong></p>
        <p style="margin: 10px 0;"><strong>If less than 3 years, please provide previous address:</strong></p>
        <p style="margin: 10px 0;"><strong>Best Phone Number(s) for both Insureds:</strong></p>
        <p style="margin: 10px 0;"><strong>Email Address(es) for both Insureds:</strong></p>

        <h4 style="color: #002868; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">HOME INSURANCE INFORMATION</h4>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">* Please attach a copy of your current Homeowners Declarations page.</p>
        
        <p style="margin: 10px 0;"><strong>Current Home Insurance Company:</strong></p>
        <p style="margin: 10px 0;"><strong>How long with current carrier?</strong></p>
        <p style="margin: 10px 0;"><strong>How do you pay?</strong> (Escrow through mortgage / Monthly / Yearly)</p>
        
        <p style="margin: 10px 0;"><strong>How many people live in the house?</strong></p>
        <p style="margin: 6px 0 12px 20px;">Adults:<br>Children:</p>

        <h5 style="color: #002868; margin: 20px 0 10px 0; font-size: 13px;">Home Details</h5>
        
        <p style="margin: 10px 0;"><strong>Age of Roof (year replaced or approximate age):</strong></p>
        <p style="margin: 10px 0;"><strong>Age of Furnace:</strong></p>
        
        <p style="margin: 10px 0;"><strong>Water Heaters:</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          How many water heaters?<br>
          Age of each:<br>
          Location(s) in the home (attic, garage, closet, exterior, etc.):
        </p>
        
        <p style="margin: 10px 0;"><strong>Pool on property?</strong> (Yes / No)<br>If Yes, Fenced? (Yes / No)</p>
        
        <p style="margin: 10px 0;"><strong>Dogs?</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Number of dogs:<br>
          Breed(s):<br>
          Any bite incidents or claims? (Yes / No)<br>
          If Yes, please explain:
        </p>
        
        <p style="margin: 10px 0;"><strong>Alarm system?</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Alarm installed? (Yes / No)<br>
          Professionally monitored? (Yes / No)<br>
          Monitoring company:
        </p>
      </div>`;
      break;

    case 'multiple':
      mainContent = `<p>Thank you for the opportunity to review your insurance.</p>
      <p>Please reply to this email and complete the form below and return it along with copies of your current Declarations (Dec) pages for both Auto and Home.</p>
      
      <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; background-color: #fafbfd; margin: 25px 0; font-size: 13px; color: #475569; line-height: 1.6;">
        <h4 style="color: #002868; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">GENERAL CONTACT INFORMATION</h4>
        
        <p style="margin: 10px 0;"><strong>Named Insured #1 (First &amp; Last Name):</strong></p>
        <p style="margin: 10px 0;"><strong>Named Insured #2 (First &amp; Last Name):</strong></p>
        <p style="margin: 10px 0;"><strong>Home Address:</strong></p>
        <p style="margin: 10px 0;"><strong>Mailing Address (if different):</strong></p>
        <p style="margin: 10px 0;"><strong>How Long at current address?</strong></p>
        <p style="margin: 10px 0;"><strong>If less than 3 years, please provide previous address:</strong></p>
        <p style="margin: 10px 0;"><strong>Best Phone Number(s) for both Insureds:</strong></p>
        <p style="margin: 10px 0;"><strong>Email Address(es) for both Insureds:</strong></p>

        <h4 style="color: #002868; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">AUTO INSURANCE INFORMATION</h4>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">* Please attach a copy of your current Auto Declarations page from your current carrier (shows coverages/limits for "apples-to-apples" comparison).</p>
        
        <p style="margin: 10px 0;"><strong>Current Auto Insurance Company:</strong></p>
        <p style="margin: 10px 0;"><strong>How long with current carrier?</strong></p>
        <p style="margin: 10px 0;"><strong>Policy Renewal Date (if known):</strong></p>

        <h5 style="color: #002868; margin: 15px 0 10px 0; font-size: 13px;">Drivers</h5>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">List all drivers in the household:</p>
        
        <p style="margin: 10px 0;"><strong>Driver 1 – Full Name:</strong></p>
        <p style="margin: 6px 0 12px 20px;">Date of Birth:<br>Driver’s License Number &amp; State:<br>Occupation:</p>
        
        <p style="margin: 10px 0;"><strong>Driver 2 – Full Name:</strong></p>
        <p style="margin: 6px 0 12px 20px;">Date of Birth:<br>Driver’s License Number &amp; State:<br>Occupation:</p>
        
        <p style="margin: 10px 0;"><strong>Driver 3 – Full Name:</strong></p>
        <p style="margin: 6px 0 12px 20px;">Date of Birth:<br>Driver’s License Number &amp; State:<br>Occupation:</p>
        
        <p style="margin: 10px 0;"><strong>Additional drivers (if any):</strong></p>
        <p style="margin: 10px 0;"><strong>How many household drivers &amp; non-drivers total?</strong></p>
        <p style="margin: 6px 0 12px 20px;">Drivers:<br>Non-drivers:</p>

        <h5 style="color: #002868; margin: 20px 0 10px 0; font-size: 13px;">Vehicles &amp; Usage</h5>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">List each vehicle and how it is used:</p>
        
        <p style="margin: 10px 0;"><strong>Vehicle 1 – Year/Make/Model:</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Who primarily drives this vehicle?<br>
          One-way miles to work or school:<br>
          How many days per week for work/school use?<br>
          Pleasure / Business use (describe):<br>
          Date purchased:<br>
          Is there a lien or lease? (Yes/No)<br>
          If Yes, Lender/Lease Company Name &amp; Address:
        </p>

        <p style="margin: 15px 0 10px 0;"><strong>Vehicle 2 – Year/Make/Model:</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Who primarily drives this vehicle?<br>
          One-way miles to work or school:<br>
          How many days per week for work/school use?<br>
          Pleasure / Business use (describe):<br>
          Date purchased:<br>
          Is there a lien or lease? (Yes/No)<br>
          If Yes, Lender/Lease Company Name &amp; Address:
        </p>
        
        <p style="margin: 10px 0;"><strong>Additional vehicles (if any):</strong></p>

        <h4 style="color: #002868; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; letter-spacing: 0.5px;">HOME INSURANCE INFORMATION</h4>
        <p style="margin: 6px 0; font-size: 12px; color: #64748b; font-style: italic;">* Please attach a copy of your current Homeowners Declarations page.</p>
        
        <p style="margin: 10px 0;"><strong>Current Home Insurance Company:</strong></p>
        <p style="margin: 10px 0;"><strong>How long with current carrier?</strong></p>
        <p style="margin: 10px 0;"><strong>How do you pay?</strong> (Escrow through mortgage / Monthly / Yearly)</p>
        
        <p style="margin: 10px 0;"><strong>How many people live in the house?</strong></p>
        <p style="margin: 6px 0 12px 20px;">Adults:<br>Children:</p>

        <h5 style="color: #002868; margin: 20px 0 10px 0; font-size: 13px;">Home Details</h5>
        
        <p style="margin: 10px 0;"><strong>Age of Roof (year replaced or approximate age):</strong></p>
        <p style="margin: 10px 0;"><strong>Age of Furnace:</strong></p>
        
        <p style="margin: 10px 0;"><strong>Water Heaters:</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          How many water heaters?<br>
          Age of each:<br>
          Location(s) in the home (attic, garage, closet, exterior, etc.):
        </p>
        
        <p style="margin: 10px 0;"><strong>Pool on property?</strong> (Yes / No)<br>If Yes, Fenced? (Yes / No)</p>
        
        <p style="margin: 10px 0;"><strong>Dogs?</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Number of dogs:<br>
          Breed(s):<br>
          Any bite incidents or claims? (Yes / No)<br>
          If Yes, please explain:
        </p>
        
        <p style="margin: 10px 0;"><strong>Alarm system?</strong></p>
        <p style="margin: 6px 0 12px 20px;">
          Alarm installed? (Yes / No)<br>
          Professionally monitored? (Yes / No)<br>
          Monitoring company:
        </p>
      </div>`;
      break;

    case 'business':
      mainContent = `<p>Thank you for requesting a business insurance quote with GJS Risk Solutions.</p>
      <p>We are shopping top carriers in Texas to find you the best rates and coverage to safeguard your business assets and operations. Gregory Smith will review your information and follow up with you shortly.</p>`;
      break;

    default:
      mainContent = `<p>Thank you for requesting an insurance quote with GJS Risk Solutions.</p>
      <p>We are shopping top carriers in Texas to find you the best rates and coverage. Gregory Smith will review your information and follow up with you shortly.</p>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GJS Risk Solutions</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e1e8ed;
    }
    .email-header {
      background: linear-gradient(135deg, #002868 0%, #004098 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .email-body {
      padding: 35px 30px;
    }
    .email-body h2 {
      color: #002868;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .email-body p {
      margin-bottom: 18px;
      color: #4a5568;
      font-size: 15px;
    }
    .contact-info {
      background-color: #f8fafc;
      border-left: 4px solid #002868;
      padding: 15px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .contact-info p {
      margin: 5px 0;
      font-size: 14px;
      color: #4a5568;
    }
    .contact-info a {
      color: #002868;
      text-decoration: none;
      font-weight: 500;
    }
    .btn-container {
      text-align: center;
      margin: 25px 0 10px 0;
    }
    .btn {
      display: inline-block;
      background-color: #002868;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
    }
    .email-footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #718096;
    }
    .email-footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header" style="background-color: #ffffff; padding: 25px 20px; text-align: center; border-bottom: 1px solid #e2e8f0; border-top: 4px solid #002868;">
      <img src="https://www.gjsrs.com/logo.png" alt="GJS Risk Solutions" style="max-height: 55px; max-width: 250px; display: block; margin: 0 auto;">
    </div>
    <div class="email-body">
      <h2>Hi ${firstName},</h2>
      ${mainContent}
      
      <div class="btn-container">
        <a href="https://calendly.com/gjsrs/15min" class="btn" target="_blank">Book a 15-Minute Call</a>
      </div>

      <div style="margin-top: 25px;">
        <p style="margin-bottom: 5px;">Regards,</p>
        <p style="margin-top: 5px; margin-bottom: 15px;"><strong>Gregory J. Smith</strong><br>Agent / Broker</p>
        
        <table style="width: 100%; font-size: 13px; color: #4a5568; line-height: 1.8; border-collapse: collapse;">
          <tr>
            <td style="padding: 2px 0;">Office: 832-387-4544 | Cell: 214-914-4282</td>
          </tr>
          <tr>
            <td style="padding: 2px 0;">Email: <a href="mailto:gsmith@gjsrs.com" style="color: #002868; text-decoration: none; font-weight: 500;">gsmith@gjsrs.com</a> | <a href="https://www.gjsrs.com" style="color: #002868; text-decoration: none; font-weight: 500;">www.gjsrs.com</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><a href="https://calendly.com/gjsrs/15min" style="color: #002868; text-decoration: none; font-weight: 500;">Book a Meeting</a> | <a href="https://www.facebook.com/GJSRiskSolutions" style="color: #002868; text-decoration: none; font-weight: 500;">Facebook</a> | <a href="https://www.instagram.com/gregorysmith_gjsrs/" style="color: #002868; text-decoration: none; font-weight: 500;">Instagram</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 11px; color: #718096;">National Producer License # - 19185151</td>
          </tr>
        </table>
      </div>
    </div>
    <div class="email-footer">
      <p>&copy; 2026 GJS Risk Solutions. All Rights Reserved.</p>
      <p>Serving all of Texas. Coverage is subject to policy terms, conditions, and exclusions.</p>
    </div>
  </div>
</body>
</html>
  `;
}
