function validateEmail(emailInput){
    const requiredFields = ["to", "from", "subject", "message"];
    for (const field of requiredFields) {
        if (!emailInput[field]) {
            throw new Error(`Invalid Email: Missing required field: ${field}`);
        }
    }

}