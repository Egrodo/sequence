// init
(() => {
  document.getElementById('startBtn').addEventListener('click', startSequence);

  // Register sw
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker
        .register('service-worker.js')
        .then(
          function(registration) {
            // Registration was successful
            console.log('Registered!');
          },
          function(err) {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err);
          },
        )
        .catch(function(err) {
          console.log(err);
        });
    });
  } else {
    console.log('service worker is not supported');
  }
})();

// Helpers
function getRealPos(e, canvas) {
  return [e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop];
}
function colorGenerator() {
  const colors = [
    ['#44AF69', 'Green'],
    ['#F8333C', 'Red'],
    ['#E59500', 'Orange'],
    ['#2B9EB3', 'Cyan'],
    ['#D8D52B', 'Yellow'],
  ];
  let i = 0;
  return () => colors[i++ % colors.length];
}

// TODO: Detect idle for x seconds and add welcome screen back.
// Main application
function startSequence() {
  // First remove welcome screen
  document.getElementById('welcomeScreen').hidden = true;

  // Init canvas
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');

  // Adjust size of canvas
  const { height, width } = canvas.getBoundingClientRect();
  canvas.height = height;
  canvas.width = width;
  window.addEventListener('resize', () => {
    const { height, width } = canvas.getBoundingClientRect();
    canvas.height = height;
    canvas.width = width;
  });

  const getColor = colorGenerator();
  let playingAnimation = false;
  let playingWinAnimation = false;

  // Register the touches initially
  const touches = new Map();

  function touchStart(e) {
    if (document.getElementById('centeredTextBox').innerText) {
      document.getElementById('centeredTextBox').innerText = '';
    }

    for (let i = 0; i < e.touches.length; ++i) {
      const touch = e.touches[i];
      if (!touches.has(touch.identifier)) {
        const color = getColor();
        touches.set(touch.identifier, { color });

        context.beginPath();
        context.arc(touch.pageX, touch.pageY, 10, 0, 2 * Math.PI);

        context.fillStyle = color[0];
        context.strokeStyle = color[0];
        context.fill();
        context.stroke();
      }
    }
    if (playingWinAnimation) {
      playingWinAnimation = false;
    }

    if (playingAnimation) {
      // Restart animation on new touch
      playingAnimation = false;
      window.setTimeout(() => {
        playingAnimation = true;
        startAnimation();
      }, 0);
    } else if (touches.size > 1) {
      playingAnimation = true;
      startAnimation();
    }
  }

  function touchMove(e) {
    for (let i = 0; i < e.touches.length; ++i) {
      const touch = e.touches[i];
      const { pageX, pageY, identifier } = touch;
      if (touches.has(identifier)) {
        const touch = touches.get(identifier);
        touch.x = pageX;
        touch.y = pageY;
        touches.set(identifier, touch);
      } else {
        console.error("Touch moved that wasn't stored?");
        console.log(touches, touch);
      }
    }

    if (e.touches.length === 1) {
      // If there's only one finger, let them draw.
      const { x, y, color } = touches.get(e.touches[0].identifier);
      context.beginPath();
      context.arc(x, y, 10, 0, 2 * Math.PI);

      context.fillStyle = color[0];
      context.strokeStyle = color[0];
      context.fill();
      context.stroke();
    }
  }

  function touchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; ++i) {
      const touch = e.changedTouches[i];
      if (touches.has(touch.identifier)) {
        touches.delete(touch.identifier);
      } else {
        console.error("Touch ended that wasn't stored?");
        console.log(touches, touch);
      }
    }
    if (touches.size === 0 && !playingWinAnimation) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (touches.size < 2 && playingAnimation && !playingWinAnimation) {
      playingAnimation = false;
    }
  }

  canvas.addEventListener('touchstart', touchStart);
  canvas.addEventListener('touchmove', touchMove);
  canvas.addEventListener('touchend', touchEnd);

  function startAnimation() {
    // Animate the circles

    let arcSize = 100;
    const arrayOfTouches = Array.from(touches);
    const winner = arrayOfTouches[Math.floor(Math.random() * arrayOfTouches.length)];
    const animateTouches = () => {
      if (playingAnimation) {
        touches.forEach((touch, identifier) => {
          const { x, y, color } = touch;
          // Draw outer circle
          context.beginPath();
          context.arc(x, y, arcSize * 10, 0, 2 * Math.PI);
          context.fillStyle = 'black';
          context.fill();

          // Draw inner circle
          context.beginPath();
          if (winner[0] === identifier && arcSize < 3) {
            context.arc(x, y, 2 * 10, 0, 2 * Math.PI);
          } else {
            context.arc(x, y, (arcSize - 1) * 10, 0, 2 * Math.PI);
          }
          context.fillStyle = color[0];
          context.fill();
        });

        arcSize -= 0.5;
        if (arcSize < 1) {
          playingAnimation = false;
          startWinAnimation(winner[1]);
        } else {
          window.requestAnimationFrame(animateTouches);
        }
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    window.requestAnimationFrame(animateTouches);
  }

  // Let this be interruptable too.
  function startWinAnimation({ x, y, color }) {
    playingWinAnimation = true;

    // Short vibration
    window.navigator.vibrate(200);

    let arcSize = 0;
    const winAnimation = () => {
      if (playingWinAnimation) {
        context.beginPath();
        context.arc(x, y, arcSize * 10, 0, 2 * Math.PI);
        context.fillStyle = color[0];
        context.fill();

        arcSize += 1;
        if (arcSize > 80) {
          playingWinAnimation = false;
        }

        window.requestAnimationFrame(winAnimation);
      } else {
        document.getElementById('centeredTextBox').innerText = `${color[1]} wins!`;
      }
    };

    window.requestAnimationFrame(winAnimation);
  }
}
