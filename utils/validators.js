// Shared validation helpers used by the auth, profile and order endpoints.

// Name: at least 3 letters, only letters (spaces allowed between words).
const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]*$/;

// Password: min 8 chars, at least one uppercase, one lowercase, one number and
// one special (non-alphanumeric) character.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// E.164-style international phone: "+" followed by a country code and digits.
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

const isNameValid = (name) => {
  const value = String(name || '').trim();
  return NAME_REGEX.test(value) && value.replace(/[^A-Za-z]/g, '').length >= 3;
};

const isPasswordValid = (password) => PASSWORD_REGEX.test(String(password || ''));

const isPhoneValid = (phone) => PHONE_REGEX.test(String(phone || '').trim());

const NAME_HINT = 'Name must be at least 3 characters long and contain only letters';
const PASSWORD_HINT =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character';
const PHONE_HINT = 'Phone number must include a country code (e.g. +2348012345678)';

module.exports = {
  NAME_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  isNameValid,
  isPasswordValid,
  isPhoneValid,
  NAME_HINT,
  PASSWORD_HINT,
  PHONE_HINT,
};
