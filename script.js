document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            
            // Toggle icon between bars and xmark
            const icon = mobileMenuToggle.querySelector('i');
            if (mainNav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Close mobile menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    });

    // Sticky Header Effect
    const header = document.getElementById('main-header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = 'var(--shadow-md)';
            header.style.padding = '0';
        } else {
            header.style.boxShadow = 'none';
        }
    });

    // ==========================================================================
    // Conversational Multi-Step Quote Wizard
    // ==========================================================================
    const quoteForm = document.getElementById('quote-form');
    
    if (quoteForm) {
        let currentStep = 1;
        const totalSteps = 3;
        
        const wizardSteps = quoteForm.querySelectorAll('.wizard-step');
        const progressSteps = document.querySelectorAll('.progress-step');
        const progressFill = document.getElementById('wizard-progress-fill');
        const typeCards = quoteForm.querySelectorAll('.type-card');
        const hiddenTypeInput = document.getElementById('insurance-type');
        const nextButtons = quoteForm.querySelectorAll('.next-step');
        const prevButtons = quoteForm.querySelectorAll('.prev-step');

        // Update Wizard UI (Step visibility, Progress bar, & Circle steps)
        const updateWizardUI = () => {
            // Update active step visibility
            wizardSteps.forEach(step => {
                const stepNum = parseInt(step.getAttribute('data-step'));
                if (stepNum === currentStep) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            // Update Progress Steps indicators (1, 2, 3)
            progressSteps.forEach(indicator => {
                const stepNum = parseInt(indicator.getAttribute('data-step'));
                if (stepNum < currentStep) {
                    indicator.classList.remove('active');
                    indicator.classList.add('completed');
                } else if (stepNum === currentStep) {
                    indicator.classList.remove('completed');
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('completed', 'active');
                }
            });

            // Calculate progress percentage (0% for step 1, 50% for step 2, 100% for step 3)
            const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
        };

        // Initialize progress bar
        updateWizardUI();

        // Step 1: Handle dynamic clicking of Insurance Type Cards
        typeCards.forEach(card => {
            card.addEventListener('click', () => {
                // Toggle active card classes
                typeCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                // Update hidden form field
                const selectedValue = card.getAttribute('data-value');
                if (hiddenTypeInput) {
                    hiddenTypeInput.value = selectedValue;
                }

                // Smoothly auto-advance to Step 2 after 350ms (micro-interaction)
                setTimeout(() => {
                    currentStep = 2;
                    updateWizardUI();
                }, 350);
            });
        });

        // Step Validation Helper
        const validateStep = (step) => {
            let isValid = true;

            if (step === 2) {
                const zipInput = document.getElementById('zipcode');
                if (zipInput) {
                    const zipVal = zipInput.value.trim();
                    const zipRegex = /^[0-9]{5}$/;
                    if (!zipVal) {
                        showValidationError(zipInput, 'Zip Code is required.');
                        isValid = false;
                    } else if (!zipRegex.test(zipVal)) {
                        showValidationError(zipInput, 'Please enter a valid 5-digit Texas Zip Code.');
                        isValid = false;
                    } else {
                        clearValidationError(zipInput);
                    }
                }
            }

            if (step === 3) {
                const nameInput = document.getElementById('name');
                const emailInput = document.getElementById('email');
                const phoneInput = document.getElementById('phone');

                if (nameInput) {
                    if (!nameInput.value.trim()) {
                        showValidationError(nameInput, 'Full Name is required.');
                        isValid = false;
                    } else {
                        clearValidationError(nameInput);
                    }
                }

                if (emailInput) {
                    const emailVal = emailInput.value.trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailVal) {
                        showValidationError(emailInput, 'Email Address is required.');
                        isValid = false;
                    } else if (!emailRegex.test(emailVal)) {
                        showValidationError(emailInput, 'Please enter a valid email address.');
                        isValid = false;
                    } else {
                        clearValidationError(emailInput);
                    }
                }

                if (phoneInput) {
                    if (!phoneInput.value.trim()) {
                        showValidationError(phoneInput, 'Phone Number is required.');
                        isValid = false;
                    } else {
                        clearValidationError(phoneInput);
                    }
                }
            }

            return isValid;
        };

        // Render validation errors dynamically
        const showValidationError = (input, message) => {
            clearValidationError(input); // Clear previous errors
            
            input.classList.add('input-error');
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'validation-error-msg';
            errorMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
            
            // Insert error message right below the offending input
            input.parentNode.appendChild(errorMsg);
            
            // Add real-time typing input listener to clear error as user types
            const clearOnInput = () => {
                clearValidationError(input);
                input.removeEventListener('input', clearOnInput);
            };
            input.addEventListener('input', clearOnInput);
        };

        // Remove validation error indicators
        const clearValidationError = (input) => {
            input.classList.remove('input-error');
            const parent = input.parentNode;
            const existingError = parent.querySelector('.validation-error-msg');
            if (existingError) {
                parent.removeChild(existingError);
            }
        };

        // Next Buttons Navigation
        nextButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    if (currentStep < totalSteps) {
                        currentStep++;
                        updateWizardUI();
                    }
                }
            });
        });

        // Back/Prev Buttons Navigation
        prevButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStep > 1) {
                    currentStep--;
                    updateWizardUI();
                }
            });
        });

        // Form Submit Simulation on Step 3
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!validateStep(3)) return;

            const name = document.getElementById('name').value;
            const submitBtn = quoteForm.querySelector('.btn-submit');
            
            if (submitBtn) {
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;

                // Send actual email using FormSubmit.co AJAX endpoint (JSON formatted payload)
                const clientEmail = document.getElementById('email').value;
                const jsonPayload = {
                    _subject: `New Quote Request from ${name}`,
                    _replyto: clientEmail,
                    "Client Name": name,
                    "Email": clientEmail,
                    "Phone": document.getElementById('phone').value,
                    "Insurance Type": document.getElementById('insurance-type').value,
                    "ZIP Code": document.getElementById('zipcode').value,
                    "Additional Details": document.getElementById('additional-details').value
                };

                fetch("https://formsubmit.co/ajax/info@gjsrs.com", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(jsonPayload)
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Form successfully submitted:', data);
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                });

                // Simulate Carrier Quoting API Call visual transition
                setTimeout(() => {
                    submitBtn.textContent = 'Quote Request Sent!';
                    submitBtn.style.backgroundColor = '#10B981'; // Success emerald green
                    submitBtn.style.color = '#FFFFFF';

                    // Alert the user of receipt
                    alert(`Thank you, ${name}! We have received your detailed Texas quote request and Greg will contact you shortly.`);

                    // Reset form fields
                    quoteForm.reset();
                    
                    // Reset card selection to Auto
                    typeCards.forEach(c => c.classList.remove('selected'));
                    const defaultCard = quoteForm.querySelector('[data-value="auto"]');
                    if (defaultCard) {
                        defaultCard.classList.add('selected');
                    }
                    if (hiddenTypeInput) {
                        hiddenTypeInput.value = 'auto';
                    }

                    // Reset button state and transition wizard back to Step 1 after 3 seconds
                    setTimeout(() => {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        submitBtn.style.backgroundColor = '';
                        submitBtn.style.color = '';
                        
                        currentStep = 1;
                        updateWizardUI();
                    }, 3000);
                    
                }, 1500);
            }
        });

        // ==========================================================================
        // Hero Quick Quoting Bar pre-fill connection to bottom Quote Wizard
        // ==========================================================================
        const heroSubmitBtn = document.getElementById('hero-submit-quote');
        
        if (heroSubmitBtn) {
            heroSubmitBtn.addEventListener('click', () => {
                const heroTypeSelect = document.getElementById('hero-insurance-type');
                const heroZipInput = document.getElementById('hero-zipcode');
                
                if (!heroTypeSelect || !heroZipInput) return;
                
                const selectedType = heroTypeSelect.value;
                const enteredZip = heroZipInput.value.trim();
                
                // Connect to bottom quote form elements
                const bottomTypeCards = document.querySelectorAll('#quote-form .type-card');
                const bottomHiddenType = document.getElementById('insurance-type');
                const bottomZipInput = document.getElementById('zipcode');
                
                // 1. Select the matching insurance type card in Step 1 of the wizard
                if (bottomTypeCards.length > 0) {
                    bottomTypeCards.forEach(card => {
                        const cardVal = card.getAttribute('data-value');
                        if (cardVal === selectedType) {
                            card.classList.add('selected');
                        } else {
                            card.classList.remove('selected');
                        }
                    });
                }
                if (bottomHiddenType) {
                    bottomHiddenType.value = selectedType;
                }
                
                // 2. Pre-populate the ZIP Code in Step 2 of the wizard
                if (bottomZipInput) {
                    bottomZipInput.value = enteredZip;
                    // Dispatch event to trigger real-time validation check in script.js
                    bottomZipInput.dispatchEvent(new Event('input'));
                }
                
                // 3. Determine wizard routing based on ZIP Code validity
                const zipRegex = /^[0-9]{5}$/;
                if (zipRegex.test(enteredZip)) {
                    // Pre-filled ZIP is 100% valid! Take them directly to the final Step 3 contact form
                    currentStep = 3;
                } else {
                    // ZIP is empty or invalid, drop them on Step 2 to enter/correct it
                    currentStep = 2;
                }
                
                // 4. Update bottom wizard step UI elements
                updateWizardUI();
                
                // 5. Smoothly scroll the visitor down to the Quote Wizard section
                const quoteSection = document.getElementById('quote');
                if (quoteSection) {
                    quoteSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
});
