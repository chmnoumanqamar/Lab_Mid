# Typing Challenge Game - CSC336 Web Technologies (Lab Mid)
COMSATS University Islamabad, Vehari Campus
Department of Computer Science

## Project Overview
This project strictly implements the exact requirements defined in the Lab Mid PDF:
1. **Mode A: Bubbles (Letter Recognition)**
   - Displays at least 5 simultaneous floating bubbles.
   - Bubbles move smoothly upward using `requestAnimationFrame`.
   - Matching key pops the bubble (+10 points).
   - Incorrect key deducts points (-5 penalty) with instant visual red flash feedback.
   - Miss limit set to 6 misses (game-over condition).
   - Speed increases dynamically as score/popped bubbles count increases.

2. **Mode B: KeyMagnet (Keyboard Precision)**
   - Target keys generated from a JavaScript array.
   - Practice set support: Home Row (A, S, D, F, J, K, L), Top Row, Numbers, and Full Alphabet.
   - Virtual keyboard highlights active target key and responds visually to keypresses.
   - Tracks correct responses, incorrect responses, accuracy percentage, and average response time in milliseconds (`performance.now()`).

3. **Mandatory Specifications**
   - Single-Page App (SPA) architecture: No page reload for Start, Restart, or Reset.
   - State management: Full cleanup of timers (`clearInterval`, `cancelAnimationFrame`) prevents duplicate loops or memory leaks.
   - Responsive Bootstrap 5 layout functional on desktop and mobile.
   - Clean, commented ES6+ code suitable for academic viva defense.

## How to Run
Simply open `index.html` in Google Chrome, Microsoft Edge, or any modern web browser.
