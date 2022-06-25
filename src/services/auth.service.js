const httpStatus = require('http-status');
const validator = require('validator');
const tokenService = require('./token.service');
const userService = require('./user.service');
const emailService = require('./email.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (username, password) => {
  let user;
  if (validator.isEmail(username)) {
    user = await userService.getUserByEmail(username);
  } else if (validator.isMobilePhone(username, 'fa-IR')) {
    user = await userService.getUserByMobile(username);
  } else {
    user = await userService.getUserByUserName(username);
  }

  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

/**
 * Send Verification Code
 * @param {string} mobile
 * @returns {Promise<User>}
 */
const sendVerificationCode = async (username, code) => {
  let user = null;
  let loginType = 'unknown';
  if (validator.isEmail(username)) {
    user = await userService.getUserByEmail(username);
    if (!user) {
      user = userService.createUser({ email: username });
    }
    loginType = 'email';
  } else if (validator.isMobilePhone(username, 'fa-IR')) {
    user = await userService.getUserByMobile(username);
    if (!user) {
      user = userService.createUser({ mobile: username });
    }
    loginType = 'mobile';
  } else {
    user = await userService.getUserByUserName(username);
    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'ussername is not available');
    }
    loginType = 'password';
  }

  if (loginType === 'email') {
    emailService.sendVerificationCodeEmail(username, code);
  }

  if (loginType === 'mobile') {
    // eslint-disable-next-line no-console
    console.log(code);
    // todo: send verification code by sms
  }

  return {
    user,
    loginType,
  };
};

/**
 * Login with code
 * @param {string} username
 * @returns {Promise<User>}
 */
const loginWithCode = async (username, token, code) => {
  const payload = await tokenService.checkTemporaryToken(username, token, code);
  let user = null;
  if (payload.loginType === 'email') {
    userService.getUserByEmail(username);
    if (user) {
      user = userService.updateUser(user, {
        isEmailVerified: true,
      });
      return user;
    }
  }

  if (payload.loginType === 'mobile') {
    user = userService.getUserByMobile(username);
    if (user) {
      user = userService.updateUser(user, {
        isMobileVerified: true,
      });
      return user;
    }
  }

  return loginUserWithEmailAndPassword(username, code);
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  sendVerificationCode,
  loginWithCode,
};
