import { validateEmail } from "./validator.js";

async function classifyEmail(emailInput) {
    
validateEmail(emailInput);
    
const emailText = `From: ${emailInput.from}
To: ${emailInput.to}
Subject: ${emailInput.subject}

${emailInput.message}`;

    const payload = {
        model: "llama3:instruct",
        messages:[
            {
                role: "system",
                content: `You are an email classifier. Classify the following email as either PHISHING or LEGITIMATE. Do not include any explanation, preamble, or markdown. 
                Output only the raw JSON object and nothing else.
                Respond only with valid JSON: {"classification": "PHISHING"|"LEGITIMATE", "confidence": 0-100, "reason": "a brief explanation"}`
            },

            {
                role: "user",
                content: emailText 
            }
        ],
        stream: false,
        format: "json"
    }
    const response = await fetch("http://localhost:11434/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

        const data = await response.json();
    
    try{
        const parsed = JSON.parse(data.choices[0].message.content);
        return parsed;
    } 
    catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error("Failed to parse email classification");
    }
}

const emailInput = {
    from: "fitnessfirst@gym.com",
    to: "davidjones@gmail.com",
    subject: "Exclusive Offer Just for You!",
    message: "Dear David, We noticed you haven't been to the gym in a while. Come back and enjoy a 50% discount on your next month! Click here to claim your offer."    
}


export { classifyEmail };

