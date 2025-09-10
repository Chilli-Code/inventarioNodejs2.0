const lottieContainer = document.querySelector('.lottie-animation');
const animationPath = lottieContainer.getAttribute('data-animation-path');
lottie.loadAnimation({
  container: lottieContainer,
  path: animationPath,
  renderer: 'svg',
  loop: true,
  autoplay: true,
  duration: 2,
  delay: 1
});