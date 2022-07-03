// init
(() => {
  document.getElementById("startBtn").addEventListener("click", startSequence);

  // Register service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("service-worker.js")
        .then(
          () => console.log("Service worker registered!"),
          () => console.log("Service worker registration failed: ", err)
        )
        .catch((err) => console.log(err));
    });
  } else {
    console.log("service worker is not supported");
  }
})();

// Constants
const COLORS = [
  ["#44AF69", "Green"],
  ["#F8333C", "Red"],
  ["#E59500", "Orange"],
  ["#2B9EB3", "Cyan"],
  ["#D8D52B", "Yellow"],
  ["#D200E9", "Purple"],
  ["#5C415D", "Violet"],
];

const welcomeScreenEl = document.getElementById("welcomeScreen");
const topTextBoxEl = document.getElementById("topTextBox");
const centeredTextBoxEl = document.getElementById("centeredTextBox");
const colorBlockContainerEl = document.getElementById("colorBlockContainer");

// Helpers
const getRealPos = (e, canvas) => [
  e.pageX - canvas.offsetLeft,
  e.pageY - canvas.offsetTop,
];
const colorGenerator = () => {
  let i = Math.floor(Math.random() * COLORS.length);
  return () => COLORS[i++ % COLORS.length];
};
const clearRect = (ctx) => ctx.clearRect(0, 0, canvas.width, canvas.height);

// Main application
function startSequence() {
  // First remove welcome screen & display instructions
  welcomeScreenEl.style.opacity = "0";
  topTextBoxEl.style.display = "block";

  // Fade in
  window.setTimeout(() => (welcomeScreenEl.style.display = "none"), 500);
  window.setTimeout(() => (topTextBoxEl.style.opacity = "1"), 700);

  // Init canvas
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  // Init audio
  const audio = document.getElementsByTagName("audio")[0];
  audio.playbackRate = 0.8;

  // Adjust size of canvas
  const { height, width } = canvas.getBoundingClientRect();
  canvas.height = height;
  canvas.width = width;
  window.addEventListener("resize", () => {
    const { height, width } = canvas.getBoundingClientRect();
    canvas.height = height;
    canvas.width = width;
  });

  const getColor = colorGenerator();
  let playingAnimation = false;
  let playingWinAnimation = false;
  let inWinState = false;

  // Register the touches initially
  const touches = new Map();

  function addColorBlock(id, color) {
    const newBlockEl = document.createElement("span");
    newBlockEl.id = `colorBlock${id}`;
    newBlockEl.classList.add("colorBlock");
    newBlockEl.style.backgroundColor = color;
    colorBlockContainerEl.appendChild(newBlockEl);
  }

  function restartAnimation() {
    playingAnimation = false;
    // On the next call frame start the animation again
    window.setTimeout(() => {
      playingAnimation = true;
      startAnimation();
    }, 1);
  }

  function touchStart(e) {
    if (playingWinAnimation) {
      return;
    }

    if (topTextBoxEl.style.opacity === "1") {
      topTextBoxEl.style.opacity = 0;
      topTextBoxEl.style.display = "none";
    }

    if (inWinState) {
      clearRect(context);
      centeredTextBoxEl.innerText = "";
      inWinState = false;
    }

    for (let i = 0; i < e.touches.length; ++i) {
      const touch = e.touches[i];
      if (!touches.has(touch.identifier)) {
        const color = getColor();
        touches.set(touch.identifier, {
          color,
          x: touch.pageX,
          y: touch.pageY,
        });

        // Add circle to the canvas
        context.beginPath();
        context.arc(touch.pageX, touch.pageY, 10, 0, 2 * Math.PI);

        context.fillStyle = color[0];
        context.strokeStyle = color[0];
        context.fill();
        context.stroke();
      }
    }

    // Redraw color blocks on new touch
    colorBlockContainerEl.innerHTML = "";
    touches.forEach((touch, id) => {
      // Add color block
      addColorBlock(id, touch.color[0]);
    });

    if (playingAnimation) {
      // Restart animation on new touch
      restartAnimation();
    } else if (touches.size > 1) {
      playingAnimation = true;
      startAnimation();
    }
  }

  function touchMove(e) {
    if (playingWinAnimation || inWinState) {
      return;
    }

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
  }

  function touchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; ++i) {
      const touch = e.changedTouches[i];
      if (touches.has(touch.identifier)) {
        touches.delete(touch.identifier);

        const colorBlock = document.getElementById(
          `colorBlock${touch.identifier}`
        );
        if (colorBlock != null) colorBlockContainerEl.removeChild(colorBlock);
      } else {
        console.error("Touch ended that wasn't stored?");
        console.log(touches, touch);
      }
    }

    // If the user removed a touch while the animation was ongoing
    if (playingAnimation && !playingWinAnimation) {
      if (touches.size < 2) {
        // If, after removing a touch, there are less than two, stop the animation.
        playingAnimation = false;
        audio.pause();
      } else {
        // Otherwise if they removed a touch but there are still more than two, just restart the animation
        restartAnimation();
      }
    }

    if (touches.size === 0 && !playingAnimation && !playingWinAnimation) {
      // If the user has not touched the screen for more than 5 seconds, add the instructions back.
      window.setTimeout(() => {
        if (!playingAnimation && !playingWinAnimation) {
          topTextBoxEl.style.display = "block";
          window.setTimeout(() => (topTextBoxEl.style.opacity = "1"), 700);
        }
      }, 5000);
    }
  }

  // Watching the click event allows us to watch for "quick touches". Use this to clear a win screen
  function quickTouch(e) {
    if (!playingAnimation && !playingWinAnimation) {
      clearRect(context);
      centeredTextBoxEl.innerText = "";
      inWinState = false;
    }
  }

  canvas.addEventListener("touchstart", touchStart);
  canvas.addEventListener("touchmove", touchMove);
  canvas.addEventListener("touchend", touchEnd);
  canvas.addEventListener("click", quickTouch);

  function startAnimation() {
    // Animate the circles
    const arrayOfTouches = Array.from(touches);
    const winner =
      arrayOfTouches[Math.floor(Math.random() * arrayOfTouches.length)];

    // Calculate what percentage of the maxArcSize to decrement by based on time passed since start and animationTime
    let arcSize = 100; // This will decrement to zero over animationTime seconds.
    let startTime = Date.now();
    const animationTime = 3 * 1000; // 3 seconds

    audio.currentTime = 0;
    audio.play();

    const currTouchSize = touches.size;
    const animateTouches = () => {
      if (playingAnimation) {
        // If the count of touches has changed since last animation we should restart the animation
        if (touches.size !== currTouchSize) {
          clearRect(context);
          startAnimation();
          return;
        }
        touches.forEach((touch, identifier) => {
          const { x, y, color } = touch;
          // Draw outer circle
          context.beginPath();
          context.arc(x, y, arcSize * 10, 0, 2 * Math.PI);
          context.fillStyle = "black";
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

        const currTime = Date.now();
        // What percentage from startTime to startTime + animationTime is currTime?
        // ((input - min) * 100) / (max - min)
        const percentComplete =
          ((currTime - startTime) * 100) /
          (startTime + animationTime - startTime);
        arcSize = 100 - percentComplete;
        if (arcSize <= 1 && !playingWinAnimation) {
          playingAnimation = false;
          startWinAnimation(winner[1]);
        } else {
          window.requestAnimationFrame(animateTouches);
        }
      } else clearRect(context);
    };

    window.requestAnimationFrame(animateTouches);
  }

  function startWinAnimation({ x, y, color }) {
    playingWinAnimation = true;

    // Short vibration
    window.navigator.vibrate(200);

    audio.pause();

    let arcSize = 0;
    const winAnimation = () => {
      if (playingWinAnimation) {
        context.beginPath();
        context.arc(x, y, arcSize * 10, 0, 2 * Math.PI);
        context.fillStyle = color[0];
        context.fill();

        // Draw a black circle where the winners finger was for increased clarity
        context.beginPath();
        context.arc(x, y, 20, 0, 2 * Math.PI);
        context.strokeStyle = "black";
        context.lineWidth = 5;
        context.stroke();

        arcSize += 1;
        if (arcSize > 80) {
          playingWinAnimation = false;
        }

        window.requestAnimationFrame(winAnimation);
      } else {
        // Win animation completino
        document.getElementById(
          "centeredTextBox"
        ).innerText = `${color[1]} wins!`;

        inWinState = true;
      }
    };

    window.requestAnimationFrame(winAnimation);
  }

  let visibilityTimerRef = null;
  // Use the interaction observer API to detect when the user has been off the app for some time and refresh the welcome screen
  const visibilityChange = () => {
    if (document.hidden) {
      if (visibilityTimerRef) {
        window.clearTimeout(visibilityTimerRef);
        visibilityTimerRef = null;
      } else {
        // If the page not visible for longer than 5 seconds, fade back in the welcome screen.
        visibilityTimerRef = window.setTimeout(() => {
          clearRect(context);
          centeredTextBoxEl.innerText = "";
          welcomeScreenEl.style.display = "block";
          welcomeScreenEl.style.opacity = 1;
        }, 5000);
      }
    }
  };

  document.addEventListener("visibilitychange", visibilityChange);
}
