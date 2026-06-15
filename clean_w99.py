import os
import sys
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

def delete_w99_sections(doc_id):
    creds_path = "/Users/harsh/Desktop/mcp server/google-mcp-server/token.json"
    if not os.path.exists(creds_path):
        print("No token.json found")
        return
        
    creds = Credentials.from_authorized_user_file(creds_path, ['https://www.googleapis.com/auth/documents'])
    service = build('docs', 'v1', credentials=creds)
    
    doc = service.documents().get(documentId=doc_id).execute()
    content = doc.get('body').get('content')
    
    # We want to find "INDMoney Pulse: 2026-W99"
    # and delete everything until the next Heading 1 or end of doc
    requests = []
    
    start_index = None
    end_index = None
    
    # Reverse iteration is easier for deletions but here we just collect ranges
    ranges_to_delete = []
    
    in_target_section = False
    
    for element in content:
        if 'paragraph' in element:
            p = element['paragraph']
            text = ""
            for el in p.get('elements', []):
                if 'textRun' in el:
                    text += el['textRun'].get('content', '')
            
            style = p.get('paragraphStyle', {}).get('namedStyleType', '')
            
            if style == 'HEADING_1':
                if "W99" in text:
                    in_target_section = True
                    start_index = element['startIndex']
                    end_index = element['endIndex']
                else:
                    if in_target_section:
                        in_target_section = False
                        ranges_to_delete.append((start_index, element['startIndex'] - 1))
            else:
                if in_target_section:
                    end_index = element['endIndex']
                    
    if in_target_section:
        ranges_to_delete.append((start_index, end_index))
        
    # Apply deletions in reverse order
    for start, end in reversed(ranges_to_delete):
        print(f"Deleting range {start} to {end}")
        requests.append({
            'deleteContentRange': {
                'range': {
                    'startIndex': start,
                    'endIndex': end
                }
            }
        })
        
    if requests:
        service.documents().batchUpdate(documentId=doc_id, body={'requests': requests}).execute()
        print("Deleted W99 sections!")
    else:
        print("No W99 sections found.")

if __name__ == "__main__":
    delete_w99_sections("1nnQF8o8ykphaydKrNnciMWQVQmhBiPDr6vuM-HZv2f4")
