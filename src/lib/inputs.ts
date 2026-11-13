const LTR_KEYBOARDS = ['email-address', 'decimal-pad', 'number-pad', 'numbers-and-punctuation', 'phone-pad', 'url'];
const LTR_CONTENT = ['emailAddress', 'password', 'newPassword', 'username', 'oneTimeCode'];

/** Inputs that hold Latin text or digits (email, password, amounts, dates, phone) are always left to right, even in Dhivehi. */
export const isLtrInput = (p: { keyboardType?: string; secureTextEntry?: boolean; textContentType?: string; autoComplete?: string }): boolean =>
  !!p.secureTextEntry || LTR_KEYBOARDS.includes(p.keyboardType ?? '') || LTR_CONTENT.includes(p.textContentType ?? '') || ['email', 'username', 'current-password', 'new-password'].includes(p.autoComplete ?? '');

