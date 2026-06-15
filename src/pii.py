import re

class PIIScrubber:
    def __init__(self):
        # Emails
        self.email_pattern = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
        self.obfuscated_email_pattern = re.compile(r'[a-zA-Z0-9_.+-]+(?:\s+at\s+|\s*\[at\]\s*)[a-zA-Z0-9-]+(?:\s+dot\s+|\s*\[dot\]\s*)[a-zA-Z0-9-.]+', re.IGNORECASE)
        # Phone numbers (Indian and international formats, basic)
        self.phone_pattern = re.compile(r'(?:\+91[\s-]*|091[\s-]*|91[\s-]*|0)?[6789]\d{9}\b')
        # Handles (like @username)
        self.handle_pattern = re.compile(r'@[a-zA-Z0-9_]+')

    def scrub(self, text: str) -> str:
        if not text:
            return text
            
        text = self.email_pattern.sub('[EMAIL]', text)
        text = self.obfuscated_email_pattern.sub('[EMAIL]', text)
        text = self.phone_pattern.sub('[PHONE]', text)
        text = self.handle_pattern.sub('[HANDLE]', text)
        
        return text
