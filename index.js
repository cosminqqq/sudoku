const parent = document.querySelector('.wrapper');

const squares = 81;
const rightBorder = [
  2, 5, 11, 14, 20, 23, 29, 32, 38, 41, 47, 50, 56, 59, 65, 68, 74, 77,
];
const bottomBorder = [
  18, 19, 20, 21, 22, 23, 24, 25, 26, 45, 46, 47, 48, 49, 50, 51, 52, 53,
];

const borderRightNone = [8, 17, 26, 35, 44, 53, 62, 71, 80];
const borderBottomNone = [72, 73, 74, 75, 76, 77, 78, 79, 80];

for (let i = 0; i < squares; i++) {
  const boxNumber = document.createElement('div');
  boxNumber.classList.add('boxes');

  if (rightBorder.includes(i)) boxNumber.classList.add('right-border');
  if (bottomBorder.includes(i)) boxNumber.classList.add('bottom-border');
  if (borderRightNone.includes(i)) boxNumber.classList.add('no-border-right');
  if (borderBottomNone.includes(i)) boxNumber.classList.add('no-border-bottom');

  parent.appendChild(boxNumber);
}

function makepuzzle(board) {
  var puzzle = [];
  var deduced = Array(81).fill(null);
  var order = [...Array(81).keys()];
  shuffleArray(order);

  for (var i = 0; i < order.length; i++) {
    var pos = order[i];
    if (deduced[pos] === null) {
      puzzle.push({
        pos: pos,
        num: board[pos],
      });
      deduced[pos] = board[pos];
      deduce(deduced);
    }
  }

  shuffleArray(puzzle);

  for (var i = puzzle.length - 1; i >= 0; i--) {
    var e = puzzle[i];
    removeElement(puzzle, i);
    var rating = checkpuzzle(boardforentries(puzzle), board);

    if (rating === -1) {
      puzzle.push(e);
    }
  }
  return boardforentries(puzzle);
}

function ratepuzzle(puzzle, samples) {
  var total = 0;

  for (var i = 0; i < samples; i++) {
    var tuple = solveboard(puzzle);
    if (tuple.answer === null) {
      return -1;
    }

    total += tuple.state.length;
  }

  return total / samples;
}

function checkpuzzle(puzzle, board) {
  if (board === undefined) {
    board = null;
  }

  var tuple1 = solveboard(puzzle);

  if (tuple1.answer === null) {
    return -1;
  }

  if (board != null && !boardmatches(board, tuple1.answer)) {
    return -1;
  }

  var difficulty = tuple1.state.length;
  var tuple2 = solvenext(tuple1.state);

  if (tuple2.answer != null) {
    return -1;
  }

  return difficulty;
}

function solvepuzzle(board) {
  return solveboard(board).answer;
}

function solveboard(original) {
  var board = [].concat(original);
  var guesses = deduce(board);

  if (guesses === null) {
    return {
      state: [],
      answer: board,
    };
  }

  var track = [
    {
      guesses: guesses,
      count: 0,
      board: board,
    },
  ];
  return solvenext(track);
}

function solvenext(remembered) {
  while (remembered.length > 0) {
    var tuple1 = remembered.pop();

    if (tuple1.count >= tuple1.guesses.length) {
      continue;
    }

    remembered.push({
      guesses: tuple1.guesses,
      count: tuple1.count + 1,
      board: tuple1.board,
    });
    var workspace = [].concat(tuple1.board);
    var tuple2 = tuple1.guesses[tuple1.count];
    workspace[tuple2.pos] = tuple2.num;
    var guesses = deduce(workspace);

    if (guesses === null) {
      return {
        state: remembered,
        answer: workspace,
      };
    }

    remembered.push({
      guesses: guesses,
      count: 0,
      board: workspace,
    });
  }

  return {
    state: [],
    answer: null,
  };
}

function deduce(board) {
  while (true) {
    var stuck = true;
    var guess = null;
    var count = 0; // fill in any spots determined by direct conflicts

    var tuple1 = figurebits(board);
    var allowed = tuple1.allowed;
    var needed = tuple1.needed;

    for (var pos = 0; pos < 81; pos++) {
      if (board[pos] === null) {
        var numbers = listbits(allowed[pos]);

        if (numbers.length === 0) {
          return [];
        } else if (numbers.length === 1) {
          board[pos] = numbers[0];
          stuck = false;
        } else if (stuck) {
          var t = numbers.map(function (val, key) {
            return {
              pos: pos,
              num: val,
            };
          });
          var tuple2 = pickbetter(guess, count, t);
          guess = tuple2.guess;
          count = tuple2.count;
        }
      }
    }

    if (!stuck) {
      var tuple3 = figurebits(board);
      allowed = tuple3.allowed;
      needed = tuple3.needed;
    } // fill in any spots determined by elimination of other locations

    for (var axis = 0; axis < 3; axis++) {
      for (var x = 0; x < 9; x++) {
        var numbers = listbits(needed[axis * 9 + x]);

        for (var i = 0; i < numbers.length; i++) {
          var n = numbers[i];
          var bit = 1 << n;
          var spots = [];

          for (var y = 0; y < 9; y++) {
            var pos = posfor(x, y, axis);
            if (allowed[pos] & bit) {
              spots.push(pos);
            }
          }

          if (spots.length === 0) {
            return [];
          } else if (spots.length === 1) {
            board[spots[0]] = n;
            stuck = false;
          } else if (stuck) {
            var t = spots.map(function (val, key) {
              return {
                pos: val,
                num: n,
              };
            });

            var tuple4 = pickbetter(guess, count, t);

            guess = tuple4.guess;
            count = tuple4.count;
          }
        }
      }
    }

    if (stuck) {
      if (guess != null) {
        shuffleArray(guess);
      }

      return guess;
    }
  }
}

function figurebits(board) {
  var needed = [];
  var allowed = board.map(function (val, key) {
    return val === null ? 511 : 0;
  }, []);

  for (var axis = 0; axis < 3; axis++) {
    for (var x = 0; x < 9; x++) {
      var bits = axismissing(board, x, axis);
      needed.push(bits);

      for (var y = 0; y < 9; y++) {
        var pos = posfor(x, y, axis);
        allowed[pos] = allowed[pos] & bits;
      }
    }
  }

  return {
    allowed: allowed,
    needed: needed,
  };
}

function posfor(x, y, axis) {
  if (axis === undefined) {
    axis = 0;
  }

  if (axis === 0) {
    return x * 9 + y;
  } else if (axis === 1) {
    return y * 9 + x;
  }

  return (
    [0, 3, 6, 27, 30, 33, 54, 57, 60][x] + [0, 1, 2, 9, 10, 11, 18, 19, 20][y]
  );
}

function axismissing(board, x, axis) {
  var bits = 0;

  for (var y = 0; y < 9; y++) {
    var e = board[posfor(x, y, axis)];

    if (e != null) {
      bits |= 1 << e;
    }
  }

  return 511 ^ bits;
}

function listbits(bits) {
  var list = [];

  for (var y = 0; y < 9; y++) {
    if ((bits & (1 << y)) != 0) {
      list.push(y);
    }
  }

  return list;
}

function pickbetter(b, c, t) {
  if (b === null || t.length < b.length) {
    return {
      guess: t,
      count: 1,
    };
  } else if (t.length > b.length) {
    return {
      guess: b,
      count: c,
    };
  } else if (randomInt(c) === 0) {
    return {
      guess: t,
      count: c + 1,
    };
  }

  return {
    guess: b,
    count: c + 1,
  };
}

function boardforentries(entries) {
  var board = Array(81).fill(null);

  for (var i = 0; i < entries.length; i++) {
    var item = entries[i];
    var pos = item.pos;
    var num = item.num;
    board[pos] = num;
  }

  return board;
}

function boardmatches(b1, b2) {
  for (var i = 0; i < 81; i++) {
    if (b1[i] != b2[i]) {
      return false;
    }
  }

  return true;
}

function randomInt(max) {
  return Math.floor(Math.random() * (max + 1));
}

function shuffleArray(original) {
  // Swap each element with another randomly selected one.
  for (var i = original.length - 1; i > 0; i--) {
    var j = randomInt(i);
    var contents = original[i];
    original[i] = original[j];
    original[j] = contents;
  }
}

function removeElement(array, from, to) {
  var rest = array.slice((to || from) + 1 || array.length);
  array.length = from < 0 ? array.length + from : from;
  return array.push.apply(array, rest);
}

let exports = {
  makepuzzle: function () {
    return makepuzzle(solvepuzzle(Array(81).fill(null)));
  },
  solvepuzzle: solvepuzzle,
  ratepuzzle: ratepuzzle,
  posfor: posfor,
};

let unique = [],
  startSudoku,
  solution,
  toggle = false,
  time = 100000000,
  index,
  timeWatch,
  box = document.querySelectorAll('.boxes'),
  timeout,
  difficulty = ['0'],
  showSolutionCheck = false,
  start = false,
  getScrollTopChrome = 0,
  getScrollTopSafari = 0;

let getdifficultyLevel = document.querySelector('.difficulty-content')
  .firstChild.nextElementSibling.value;

function turn0to9() {
  startSudoku.forEach((element, index) => {
    if (element == 0) startSudoku[index] = 9;
  });

  solution.forEach((element, index) => {
    if (element == 0) solution[index] = 9;
  });
}

function checkSquare(value) {
  let squareArray = [];

  let row = value - Math.floor(value % 3),
    column = Math.floor(value / 9) % 3,
    rowIndex = index - Math.floor(index % 3),
    columnIndex = Math.floor(index / 9) % 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      box[rowIndex - columnIndex * 9 + i * 9 + j].style.backgroundColor =
        '#e2ebf3';
      squareArray.push(row - column * 9 + i * 9 + j);
    }
  }

  return squareArray;
}

function addNotes(key) {
  let checkDigit = false;

  if (box[index].childElementCount == 0 && box[index].innerText !== '')
    box[index].innerHTML = '';

  box[index].childNodes.forEach((elem) => {
    if (elem.innerText == key) {
      elem.remove();
      checkDigit = true;
    }
  });

  if (checkDigit) return;

  let paragraph = document.createElement('p');
  paragraph.innerHTML = key;

  box[index].appendChild(paragraph);
}

function checkRowCol(value) {
  let boxArray = [],
    squareArray = [];

  for (let i = 0; i < 9; i++) {
    let getNumberH = Number((value / 9).toString()[0]);
    let getNumberV = value;

    let getIndexH = Number((index / 9).toString()[0]);
    let getIndexV = index;

    while (getNumberV - 9 >= 0) {
      getNumberV = getNumberV - 9;
      getIndexV = getIndexV - 9;
    }

    boxArray.push(getNumberV + 9 * i);
    boxArray.push(`${getNumberH}${i}` - getNumberH);

    if (value == index) {
      box[`${getIndexH}${i}` - getIndexH].style.backgroundColor = '#e2ebf3';
      box[`${getIndexV + 9 * i}`].style.backgroundColor = '#e2ebf3';
    }
  }

  squareArray = checkSquare(value);

  boxArray = [...boxArray, ...squareArray];
  return boxArray;
}

let drainingFunctions = null;

function newGame() {
  if (showSolutionCheck) return;

  let difficultyLevel, mainSolution;
  startSudoku = exports.makepuzzle();
  solution = exports.solvepuzzle(startSudoku);

  document.querySelector('.background-win').classList.remove('opacity-visible');
  document.querySelector('.solution').classList.remove('pointer-events');

  time = 100000000;
  document.querySelector('.timer').innerHTML = '00:00';

  clearInterval(timeWatch);
  timeWatch = setInterval(timer, 1000);

  mainSolution = startSudoku.filter((x) => Number(x));

  switch (getdifficultyLevel) {
    case '0':
      difficultyLevel = 40 - mainSolution.length;
      break;
    case '1':
      difficultyLevel = 34 - mainSolution.length;
      break;
    case '2':
      difficultyLevel = 30 - mainSolution.length;
      break;
    case '3':
      difficultyLevel = 25 - mainSolution.length;
      break;
    case '4':
      difficultyLevel = 0;
      break;
  }

  turn0to9();

  for (let i = 0; i < Math.round(difficultyLevel / 3); i++) {
    let check = true;
    let randomNumber = Math.floor(Math.random() * 28);

    while (startSudoku[randomNumber] === null && check) {
      startSudoku[randomNumber] = solution[randomNumber];

      if (startSudoku[randomNumber] === null) {
        check = false;
      } else {
        randomNumber = Math.floor(Math.random() * 28);
      }
    }
  }

  for (let i = 0; i < Math.round(difficultyLevel / 3); i++) {
    let randomNumber = Math.floor(Math.random() * 28) + 28;

    while (startSudoku[randomNumber] === null) {
      startSudoku[randomNumber] = solution[randomNumber];

      if (startSudoku[randomNumber] === null) {
        check = false;
      } else {
        randomNumber = Math.floor(Math.random() * 28);
      }
    }
  }

  for (let i = 0; i < Math.round(difficultyLevel / 3); i++) {
    let randomNumber = Math.floor(Math.random() * 28) + 56;

    while (startSudoku[randomNumber] === null && randomNumber < 81) {
      startSudoku[randomNumber] = solution[randomNumber];

      if (startSudoku[randomNumber] === null) {
        check = false;
      } else {
        randomNumber = Math.floor(Math.random() * 28);
      }
    }
  }

  unique = [];
  startSudoku.forEach((element, index) => {
    box[index].innerHTML = '';
    box[index].classList.remove('important');

    if (element) {
      box[index].innerHTML = element;
      box[index].classList.add('important');

      unique = [...unique, index];
    }
  });
}

function victoryCheck() {
  let check = 0;
  solution.forEach((element, index) => {
    if (element == box[index].innerText) check++;
  });
  if (check == 81) gameWon();
}

function gameWon() {
  clearInterval(timeWatch);
  document.querySelector('.background-win').classList.toggle('display-block');
  document.querySelector('.background-win').classList.toggle('opacity-visible');

  document.querySelector('.solution').classList.toggle('pointer-events');

  document.querySelector('.end-game-difficulty :nth-child(2)').innerHTML =
    document.querySelector('.open-bar').innerText;

  document.querySelector('.end-game-time :nth-child(2)').innerHTML =
    document.querySelector('.timer').innerText;
}

function showSolution() {
  let showSolution = document.querySelector('.wrapper').cloneNode(true);
  showSolution.classList.add('solved-wrapper');

  showSolutionCheck = true;

  document.querySelector('.wrapper').classList.toggle('display-none');
  document.querySelector('.numbers').classList.toggle('display-none');

  showSolution.childNodes.forEach((element, index) => {
    element.innerHTML = solution[index];
    element.style.color = '#2d567e';
  });

  document.querySelector('.content').appendChild(showSolution);

  document.querySelector('.restart-solution').classList.toggle('display-block');
  document.querySelector('.solution').classList.toggle('display-none');

  document.querySelector('.game-text').classList.toggle('pointer-events');
  document.querySelector('.solution').classList.toggle('pointer-events');

  clearInterval(timeWatch);
}

document.querySelector('.wrapper').addEventListener('mouseup', (e) => {
  index = Array.from(e.target.parentElement.children).indexOf(e.target);

  let focusedNumber = e.target.innerText;

  document.querySelectorAll('.boxes').forEach((element) => {
    element.style.backgroundColor = 'white';

    if (element.innerText === focusedNumber && element.innerText) {
      element.style.backgroundColor = '#cfcfcf';
    }
  });

  if (e.target.classList[0] !== 'wrapper') {
    checkRowCol(index);
  }

  e.target.style.backgroundColor = '#f7bc48';
});

document.querySelector('.panel').addEventListener('click', (e) => {
  if (e.target.className == 'game-text') {
    newGame();
  }
});

document.querySelector('.numbers').addEventListener('click', (e) => {
  let insideValue = e.target.innerText;

  if (Number(insideValue)) {
    if (index !== undefined && !unique.includes(index)) {
      if (document.querySelector('.notes-state').innerText == 'On') {
        addNotes(insideValue);
        return;
      }

      box[index].innerHTML = insideValue;
      let once = [...new Set(checkRowCol(index))];

      box[index].innerHTML = insideValue;

      once.forEach((element) => {
        value = 0;
        let eachElement = [...new Set(checkRowCol(element))],
          elem = element;

        eachElement.forEach((element) => {
          if (box[element].innerText == box[elem].innerText) value++;
        });

        let color = value <= 1 ? '#0072e3' : 'red';
        box[element].style.color = color;
      });

      victoryCheck();
    }
  }

  if (insideValue == 'Del') {
    value = 0;
    let removedValue = box[index].innerText;
    if (!unique.includes(index)) {
      box[index].innerHTML = '';
    } else {
      return false;
    }

    let numberChain = [];

    once = [...new Set(checkRowCol(index))];

    once.forEach((element) => {
      if (box[element].innerText == removedValue)
        numberChain = [...numberChain, element];
    });

    numberChain.forEach((element) => {
      value = 0;

      once = [...new Set(checkRowCol(element))];

      once.forEach((element) => {
        if (box[element].innerText == removedValue) value++;
      });

      if (value > 1) {
        box[element].style.color = 'red';
      } else {
        box[element].style.color = '#0072e3';
      }
    });
  }
});

document.addEventListener('keydown', (event) => {
  let value = 0,
    once = [...new Set(checkRowCol(index))];

  if (Number(event.key) && !unique.includes(index) && index !== undefined) {
    if (document.querySelector('.notes-state').innerText == 'On') {
      addNotes(event.key);
      return;
    }

    box[index].innerHTML = event.key;

    once.forEach((element) => {
      value = 0;
      let eachElement = [...new Set(checkRowCol(element))],
        elem = element;

      eachElement.forEach((element) => {
        if (box[element].innerText == box[elem].innerText) value++;
      });

      let color = value <= 1 ? '#0072e3' : 'red';
      box[element].style.color = color;
    });

    victoryCheck();
  }

  if (event.key == 'Backspace') {
    let removedValue = box[index].innerText;

    if (removedValue == '') return;

    if (!unique.includes(index)) {
      box[index].innerHTML = '';
    } else {
      return false;
    }

    let numberChain = [];

    once = [...new Set(checkRowCol(index))];

    once.forEach((element) => {
      if (box[element].innerText == removedValue)
        numberChain = [...numberChain, element];
    });

    numberChain.forEach((element) => {
      value = 0;

      once = [...new Set(checkRowCol(element))];

      once.forEach((element) => {
        if (box[element].innerText == removedValue) value++;
      });

      if (value > 1) {
        box[element].style.color = 'red';
      } else {
        box[element].style.color = '#0072e3';
      }
    });
  }
});

function changeLevel(value) {
  getdifficultyLevel = value;

  if (start) {
    newGame();
  }
}

document.querySelector('.start-game').addEventListener('click', (e) => {
  start = true;

  document.querySelector('.wrapper').style.display = 'flex';
  document.querySelector('.panel').classList.remove('panel-925');
  document.querySelector('.difficulty').classList.remove('difficulty-925');

  document.querySelector('.game-text').classList.remove('restart-remove');
  document.querySelector('.game-text').classList.remove('pointer-events');
  document.querySelector('.game-text').classList.remove('game-remove-onstart');
  document.querySelector('.numbers').classList.remove('display-none');
  document.querySelector('.game-notes').classList.remove('display-none');
  document.querySelector('.show-solution').classList.remove('display-none');
  document
    .querySelector('.wrapper-parent')
    .classList.remove('initial-wrapper-parent');
  document.querySelector('.content').classList.remove('initial-content');
  document.querySelector('.solution').classList.remove('pointer-events');
  document.querySelector('.start-game').style.display = 'none';
  newGame();
});

document.querySelector('.solution').addEventListener('click', (e) => {
  showSolution();
  document.querySelector('.game-text').classList.toggle('restart-remove');
});

document.querySelector('.restart-solution').addEventListener('click', () => {
  showSolutionCheck = false;

  newGame();

  document.querySelector('.wrapper').classList.toggle('display-none');
  document.querySelector('.restart-solution').classList.toggle('display-block');
  document.querySelector('.numbers').classList.toggle('display-none');
  document.querySelector('.solution').classList.toggle('display-none');
  document.querySelector('.game-text').classList.remove('restart-remove');

  document.querySelector('.solved-wrapper').remove();

  document.querySelector('.game-text').classList.remove('pointer-events');
  document.querySelector('.solution').classList.remove('pointer-events');
});

function timer() {
  time++;
  timeArray = Array.from(String(time), Number);

  if (timeArray[7] == 6 && timeArray[8] == 0) {
    timeArray[8] = timeArray[7] = 0;
    timeArray[6] += 1;

    if (timeArray[6] == 10) {
      timeArray[6] = 0;
      timeArray[5] += 1;
    }

    if (timeArray[5] == 6 && timeArray[6] == 0) {
      timeArray[6] = timeArray[5] = 0;
      timeArray[4] = timeArray[4] + 1;
    }
    if (timeArray[4] == 10) {
      timeArray[4] = 0;
      timeArray[3] += 1;
    }

    if (timeArray[3] == 6 && timeArray[4] == 0) {
      timeArray[4] = timeArray[3] = 0;
      timeArray[2] = timeArray[2] + 1;
    }

    if (timeArray[2] == 10) {
      timeArray[2] = 0;
      timeArray[1] += 1;
    }
  }

  let newTime = timeArray.join('');
  time = Number(newTime);

  let timeArrayReverse = timeArray.reverse();
  let clock = `${timeArrayReverse[3]}${timeArrayReverse[2]}:${timeArrayReverse[1]}${timeArrayReverse[0]}`;

  document.querySelector('.timer').innerHTML = clock;
}

document.querySelectorAll('.rulesClick').forEach((element) => {
  element.addEventListener('click', () => {
    document.querySelector('.rules-info').classList.add('display-block');
    document.querySelector('.background-shadow').classList.add('display-block');

    getScrollTopChrome = document.documentElement.scrollTop;
    getScrollTopSafari = document.body.scrollTop;

    if (getScrollTopChrome > 0 || getScrollTopSafari > 0) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  });
});

document.querySelector('.background-shadow').addEventListener('click', (e) => {
  document
    .querySelector('.background-shadow')
    .classList.remove('display-block');
  document.querySelector('.rules-info').classList.remove('display-block');

  document.documentElement.scrollTop = getScrollTopChrome;
  document.body.scrollTop = getScrollTopSafari;
});

document.querySelector('.rules-checked').addEventListener('click', () => {
  document
    .querySelector('.background-shadow')
    .classList.remove('display-block');
  document.querySelector('.rules-info').classList.remove('display-block');

  document.documentElement.scrollTop = getScrollTopChrome;
  document.body.scrollTop = getScrollTopSafari;
});

document.querySelectorAll('.toggle-note').forEach((element) => {
  element.addEventListener('click', () => {
    if (!toggle) {
      document.querySelector('.notes-state').innerHTML = 'On';
      toggle = true;
    } else {
      document.querySelector('.notes-state').innerHTML = 'Off';
      toggle = false;
    }
  });
});
