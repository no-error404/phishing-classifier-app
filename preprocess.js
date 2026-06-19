import fs from 'node:fs/promises';
import path from 'node:path';
import { simpleParser } from 'mailparser';

async function loadHamEmail(){
// read folder, return array of {from, to, subject, message, label} objects
const folderPath = path.join(import.meta.dirname, 'ham');
const files = await readdir(folderPath);
const hamEmails = [];

for (const file of files) {
    const filePath = path.join(folderPath, file);
//1. get all the file names in the ham folder
    const content = await readFile(filePath);
//2. for each file, read the content and parse it using mailparser
    const email = await simpleParser(content);
//3. extract from, to, subject, message and label (ham)
//4. add to array of hamEmails
    hamEmails.push({
        from: email.from.value[0].address,
        to: email.to.value[0].address,
        subject: email.subject,
        message: email.text,
        label: 'LEGITIMATE'
    });
}}

async function loadPhishingEmails(){
// parse mbox, return array of {from, to, subject, message, label} objects
    const filePath = path.join(import.meta.dirname,'phishing.mbox');
    const content = await readFile(filePath, 'utf-8');
    const rawEmails = content.split('\nFrom '); // mbox format separates emails with "From " line
    const phishingEmails = [];

    for (const rawEmail of rawEmails){

        if (!rawEmail.trim()) continue; // skip empty entries

        const formattedEmail = rawEmail.startsWith('From ') ? rawEmail : 'From ' + rawEmail; // ensure each email starts with "From "

        const email = await simpleParser(formattedEmail);
        
        phishingEmails.push({
            from: email.from.value[0].address || 'unknown@sender.com',
            to: email.to.value[0].address || 'unknown@receiver.com',
            subject: email.subject || '(No Subject)',
            message: email.text | email.textAsHtml || '',
            label: 'PHISHING'
        });
    }
    return phishingEmails;

     catch (error) {
        console.error("Error reading or parsing the mbox file:", error);
        return []; // Return an empty array if something goes totally wrong
    }
    
}

async function main(){
// call both loaders
// combine results
// write to emails.json
    const hamEmails = await loadHamEmail();
    const phishingEmails = await loadPhishingEmails();
    const allEmails = [...hamEmails, ...phishingEmails];
    await fs.writeFile(path.join(import.meta.dirname, 'emails.json'), JSON.stringify(allEmails, null, 2));
}