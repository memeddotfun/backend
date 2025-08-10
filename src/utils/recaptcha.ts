import axios from 'axios';

/**
 * Verifies a reCAPTCHA token with Google reCAPTCHA Enterprise API using REST API
 * @param token The reCAPTCHA token from the client
 * @param action The expected action name (optional)
 * @param minScore The minimum score threshold (default: 0.5)
 * @returns Promise<boolean> True if the token is valid and meets the score threshold
 */
export const verifyRecaptcha = async (
  token: string,
  action?: string,
  minScore: number = 0.5
): Promise<boolean> => {
  try {
    const projectID = process.env.RECAPTCHA_PROJECT_ID || "plexiform-bot-462008-g7";
    const recaptchaKey = process.env.RECAPTCHA_SITE_KEY || "6Lc5YlYrAAAAAOcEIyyS92nTbEQqe5a8nWieYRmS";
    const recaptchaAction = action || "waitlist_submit";
    
    // Use the REST API instead of the client library
    const apiUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectID}/assessments?key=${process.env.RECAPTCHA_API_KEY}`;
    
    const requestBody = {
      event: {
        token: token,
        siteKey: recaptchaKey,
        expectedAction: recaptchaAction
      }
    };
    
    const response = await axios.post(apiUrl, requestBody);
    const data = response.data;

    // Check if response has tokenProperties
    if (!data || !data.tokenProperties) {
      console.log('Invalid reCAPTCHA response: missing tokenProperties');
      return false;
    }

    // Check if the token is valid
    if (!data.tokenProperties.valid) {
      console.log(`reCAPTCHA token invalid: ${data.tokenProperties.invalidReason || 'unknown reason'}`);
      return false;
    }

    // Check if the expected action was executed
    if (action && data.tokenProperties.action !== recaptchaAction) {
      console.log(`reCAPTCHA action mismatch: expected=${recaptchaAction}, got=${data.tokenProperties.action || 'undefined'}`);
      return false;
    }

    // Check if response has riskAnalysis
    if (!data.riskAnalysis) {
      console.log('Invalid reCAPTCHA response: missing riskAnalysis');
      return false;
    }
    
    // Get the risk score
    const score = data.riskAnalysis.score;
    
    // Check if score exists
    if (score === undefined || score === null) {
      console.log('Invalid reCAPTCHA response: missing score');
      return false;
    }
    
    console.log(`reCAPTCHA score: ${score}`);
    
    // Log reasons if available
    if (data.riskAnalysis.reasons && data.riskAnalysis.reasons.length > 0) {
      console.log('Risk reasons:', data.riskAnalysis.reasons);
    }

    // Check if the score meets the minimum threshold
    if (score < minScore) {
      console.log(`reCAPTCHA score too low: ${score} < ${minScore}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying reCAPTCHA token:', error);
    return false;
  }
};