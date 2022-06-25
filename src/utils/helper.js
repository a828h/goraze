const generateRoundedVerificationCode = (rand) => {
  if (rand) {
    return rand;
  }
  let code = '';
  while (code.length < 6) {
    let d1 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    d1 = d1[Math.floor(Math.random() * d1.length)];
    // d1 = d1[random(0, d1.length - 1)];
    let d2 = [0, 5, d1];
    d2 = d2[Math.floor(Math.random() * d2.length)];
    // d2 = d2[rand(0, count($d2) - 1)];
    code = `${d1}${d2}`;
  }
  return code;
};
module.exports = {
  generateRoundedVerificationCode,
};
