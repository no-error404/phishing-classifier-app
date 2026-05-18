async function classifyEmail(emailText) {
    const payload = {
        model: "llama3:instruct",
        messages:[
            {
                role: "system",
                content: `You are an email classifier. Classify the following email as either PHISHING or LEGITIMATE. 
                Respond only with valid JSON: {"classification": "PHISHING"|"LEGITIMATE", "confidence": 0-100, "reason": "a brief explanation"}`
            },

            {
                role: "user",
                content: emailText 
            }
        ],
        stream: false
    }
    const response = await fetch("http://localhost:11434/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    });
    
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

const result = await classifyEmail("Dear user, click here to verify your bank account immediately or it will be suspended.");
console.log(result);