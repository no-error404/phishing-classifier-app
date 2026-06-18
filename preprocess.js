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
}

async function loadPhshingEmails(){
// parse mbox, return array of {from, to, subject, message, label} objects
}

async function main(){
// call both loaders
// combine results
// write to emails.json
}