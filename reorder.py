import re

with open('index.html', 'r') as f:
    content = f.read()

def get_block(name, next_name=None):
    start_idx = content.find(name)
    if start_idx == -1:
        raise Exception(f"Could not find {name}")
    if next_name:
        end_idx = content.find(next_name)
        if end_idx == -1:
            raise Exception(f"Could not find {next_name}")
        return content[start_idx:end_idx]
    else:
        return content[start_idx:]

header = get_block('<!-- Header Navigation -->', '<!-- Hero Section -->')
hero = get_block('<!-- Hero Section -->', '<!-- Services Section -->')
services = get_block('<!-- Services Section -->', '<!-- Why Choose Us -->')
why_us = get_block('<!-- Why Choose Us -->', '<!-- Meet Your Advisor / Bio Section -->')
bio = get_block('<!-- Meet Your Advisor / Bio Section -->', '<!-- Google Reviews Section -->')
reviews = get_block('<!-- Google Reviews Section -->', '<!-- CTA / Contact Form -->')
contact = get_block('<!-- CTA / Contact Form -->', '<!-- Footer -->')
footer = get_block('<!-- Footer -->')

top = content[:content.find('<!-- Header Navigation -->')]

new_content = top + header + hero + why_us + bio + services + reviews + contact + footer

with open('index.html', 'w') as f:
    f.write(new_content)

print("Reordering complete")
