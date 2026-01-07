# Bulk Email Feature

## Overview
The admin panel now includes functionality to send bulk emails to all registered users with rich text formatting, attachments, and embedded images.

## Location
- **Admin Page**: `http://localhost:3000/admin/send-email`
- **Navigation**: Access via the "Send Email" link in the admin sidebar

## Features

### 1. Rich Text Editor
- Bold, Italic, Underline, Strikethrough formatting
- Headings (H1, H2, H3)
- Bullet and numbered lists
- Text color selection
- Links and images
- Direct image pasting (Ctrl+V) from clipboard

### 2. Email Personalization
Use placeholders in your email body that will be automatically replaced:
- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{fullName}}` - User's full name

### 3. File Attachments
- Click "Add Attachment" to upload files
- Multiple files can be attached
- Displays file name and size
- Remove attachments before sending

### 4. Email Configuration
- **From Address**: no-reply@inceasar.com (Zoho Mail)
- **SMTP Settings**: Configured in `.env.local`
- Sends to all users with role='USER' in the database

## Environment Variables
```env
# No-Reply Email Configuration
NO_REPLY_EMAIL=no-reply@inceasar.com
NO_REPLY_PASSWORD=your_password_here
```

## API Endpoint
- **URL**: `/api/admin/send-bulk-email`
- **Method**: POST
- **Authentication**: Admin token required (cookie-based)
- **Request Body**:
```json
{
  "subject": "Email subject",
  "htmlBody": "<p>HTML content with {{placeholders}}</p>",
  "attachments": [
    {
      "filename": "file.pdf",
      "content": "base64_encoded_content",
      "contentType": "application/pdf"
    }
  ]
}
```

## Response Format
```json
{
  "message": "Emails sent successfully",
  "total": 100,
  "successful": 98,
  "failed": 2,
  "results": [
    { "email": "user@example.com", "status": "sent" },
    { "email": "user2@example.com", "status": "failed", "error": "..." }
  ]
}
```

## Usage Instructions

1. **Navigate to Send Email Page**
   - Log in as admin
   - Click "Send Email" in the sidebar

2. **Compose Email**
   - Enter a subject line
   - Use the rich text editor toolbar to format your message
   - Paste images directly with Ctrl+V
   - Use placeholders for personalization

3. **Add Attachments (Optional)**
   - Click "Add Attachment" button
   - Select one or more files
   - Review attached files before sending

4. **Send Email**
   - Click "Send Email to All Users"
   - Confirm the action in the popup
   - Wait for the sending process to complete
   - View success/failure statistics

## Technical Details

### Dependencies
- `@tiptap/react` - Rich text editor
- `@tiptap/starter-kit` - Basic editor features
- `@tiptap/extension-image` - Image support
- `@tiptap/extension-link` - Link support
- `@tiptap/extension-underline` - Underline formatting
- `@tiptap/extension-color` - Text color
- `nodemailer` - Email sending

### Database Query
Fetches users with:
```sql
SELECT email, first_name, last_name 
FROM users 
WHERE role = 'USER'
```

### Security
- Admin authentication required (JWT token)
- Role check (ADMIN only)
- Email credentials stored in environment variables
- Proper error handling and logging

## Troubleshooting

### Emails Not Sending
1. Verify `.env.local` has correct email credentials
2. Check Zoho mail account is active
3. Ensure no-reply@inceasar.com has SMTP access enabled
4. Review server logs for specific errors

### Images Not Displaying
- Images pasted or inserted are embedded as base64
- Large images may increase email size
- Some email clients may block images by default

### Authentication Errors
- Ensure you're logged in as admin
- Check JWT token is valid
- Verify admin role in database

## Best Practices

1. **Test First**: Send to a test account before bulk sending
2. **Personalize**: Use placeholders to make emails more engaging
3. **Keep It Simple**: Avoid excessive formatting or large attachments
4. **Monitor Results**: Check the success/failure report after sending
5. **Timing**: Send emails during appropriate hours for your audience
