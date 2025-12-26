export const emailTemplateGeneric = (verificationCode: number) => {
  return `<h2>Hi there,</h2>
    ${`<h4>Thank you for using our service. Please use the following code.</h4>`}
    <h1>${verificationCode}</h1>
    <p>If you did not request this, please ignore this email. This Code will expire in 10 minutes</p>
    `;
};
