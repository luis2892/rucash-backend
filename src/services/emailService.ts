export const emailService = {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    console.log(`📧 [SIMULATED] Verification email sent to ${email}`);
    console.log(`   Link: ${verificationLink}`);
    console.log(`   Token: ${token}`);

    // TODO: Integrar con SendGrid
  },

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    console.log(`📧 [SIMULATED] Password reset email sent to ${email}`);
    console.log(`   Link: ${resetLink}`);
    console.log(`   Token: ${token}`);
  },

  async send2FADisabledEmail(email: string): Promise<void> {
    console.log(`📧 [SIMULATED] 2FA disabled notification sent to ${email}`);
  },
};
