import {readdir, readFile, writeFile} from 'fs/promises';
import path from 'node:path';

async function loadHamEmail(){
// read folder, return array of {text, label} objects
}

async function loadPhshingEmails(){
// parse mbox, return array of {text, label} objects
}

async function main(){
// call both loaders
// combine results
// write to emails.json
}