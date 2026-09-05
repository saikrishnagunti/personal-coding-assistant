class Calculator {
  constructor(previousOperandTextElement, currentOperandTextElement) {
    this.previousOperandTextElement = previousOperandTextElement;
    this.currentOperandTextElement = currentOperandTextElement;
    this.clear();
  }

  clear() {
    this.currentOperand = '0';
    this.previousOperand = '';
    this.operation = undefined;
    this.shouldResetScreen = false;
  }

  delete() {
    if (this.shouldResetScreen) {
      this.clear();
      return;
    }
    if (this.currentOperand === '0' || this.currentOperand === 'Error') return;
    if (this.currentOperand.length === 1) {
      this.currentOperand = '0';
    } else {
      this.currentOperand = this.currentOperand.slice(0, -1);
    }
  }

  appendNumber(number) {
    if (this.currentOperand === 'Error') this.clear();
    if (this.shouldResetScreen) {
      this.currentOperand = '';
      this.shouldResetScreen = false;
    }
    if (number === '.' && this.currentOperand.includes('.')) return;
    if (this.currentOperand === '0' && number !== '.') {
      this.currentOperand = number.toString();
    } else {
      this.currentOperand += number.toString();
    }
  }

  chooseOperation(operation) {
    if (this.currentOperand === 'Error') return;
    if (this.currentOperand === '' && this.previousOperand !== '') {
      this.operation = operation;
      return;
    }
    if (this.previousOperand !== '') {
      this.compute();
    }
    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.shouldResetScreen = true;
  }

  compute() {
    let computation;
    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);
    if (isNaN(prev) || isNaN(current)) return;

    switch (this.operation) {
      case '+':
        computation = prev + current;
        break;
      case '-':
        computation = prev - current;
        break;
      case '*':
        computation = prev * current;
        break;
      case '/':
        if (current === 0) {
          this.currentOperand = 'Error';
          this.previousOperand = '';
          this.operation = undefined;
          this.shouldResetScreen = true;
          return;
        }
        computation = prev / current;
        break;
      default:
        return;
    }

    // Format float precision
    this.currentOperand = Math.round(computation * 1e10) / 1e10 + '';
    this.operation = undefined;
    this.previousOperand = '';
    this.shouldResetScreen = true;
  }

  toggleSign() {
    if (this.currentOperand === '0' || this.currentOperand === 'Error') return;
    this.currentOperand = (parseFloat(this.currentOperand) * -1).toString();
  }

  percent() {
    if (this.currentOperand === 'Error') return;
    this.currentOperand = (parseFloat(this.currentOperand) / 100).toString();
  }

  getDisplayNumber(number) {
    if (number === 'Error') return 'Error';
    const stringNumber = number.toString();
    const integerDigits = parseFloat(stringNumber.split('.')[0]);
    const decimalDigits = stringNumber.split('.')[1];
    let integerDisplay;
    if (isNaN(integerDigits)) {
      integerDisplay = '';
    } else {
      integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
    }
    if (decimalDigits != null) {
      return `${integerDisplay}.${decimalDigits}`;
    } else {
      return integerDisplay;
    }
  }

  updateDisplay() {
    this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
    if (this.operation != null) {
      const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
      this.previousOperandTextElement.innerText = `${this.getDisplayNumber(this.previousOperand)} ${opSymbols[this.operation] || this.operation}`;
    } else {
      this.previousOperandTextElement.innerText = '';
    }
  }
}

// Initialization & DOM Binding
const previousOperandTextElement = document.getElementById('previous-operand');
const currentOperandTextElement = document.getElementById('current-operand');
const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement);

document.querySelectorAll('.btn').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const value = button.dataset.value;

    if (!action && value != null) {
      calculator.appendNumber(value);
    } else if (action === 'operator') {
      calculator.chooseOperation(value);
    } else if (action === 'equals') {
      calculator.compute();
    } else if (action === 'clear') {
      calculator.clear();
    } else if (action === 'delete') {
      calculator.delete();
    } else if (action === 'toggle-sign') {
      calculator.toggleSign();
    } else if (action === 'percent') {
      calculator.percent();
    }

    calculator.updateDisplay();
  });
});

// Keyboard support
document.addEventListener('keydown', e => {
  if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
    calculator.appendNumber(e.key);
  } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
    calculator.chooseOperation(e.key);
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    calculator.compute();
  } else if (e.key === 'Backspace') {
    calculator.delete();
  } else if (e.key === 'Escape') {
    calculator.clear();
  } else if (e.key === '%') {
    calculator.percent();
  }
  calculator.updateDisplay();
});
