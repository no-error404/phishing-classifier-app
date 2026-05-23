function validateEmail(emailInput){
    const requiredFields = ["to", "from", "subject", "message"];
    for (const field of requiredFields) {
        if (!emailInput[field]) {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }

}