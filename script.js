//-----------------------------------------------------------
// 1. Globale variabelen
//-----------------------------------------------------------

// Volledige originele lijst van vragen
let allQuestions = [];

// Actieve vragenlijst (kan een subset van foutvragen zijn)
let questions = [];

// Huidige vraag-index
let currentQuestionIndex = 0;

// Bijhouden van antwoorden: true = correct, false = fout
let answeredQuestions = [];

// Weten of we in een retry-ronde zitten (foutvragen)
let isRetryRound = false;

//-----------------------------------------------------------
// 2. HTML elementen ophalen
//-----------------------------------------------------------
const scoreElement = document.getElementById("score");
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");
const qimg = document.getElementById("qimg");
const jumpInput = document.getElementById("jumpTo");
const jumpBtn = document.getElementById("jumpBtn");
const restartButton = document.getElementById("restartButton");
const stopButton = document.getElementById("stopButton");

//-----------------------------------------------------------
// 3. CSV inladen
//-----------------------------------------------------------
fetch("questions.csv")
  .then(res => res.text())
  .then(data => {
      const rows = data.trim().split("\n");
      rows.shift(); // header weg

      rows.forEach(row => {
          const cols = row.split(";");

          const answers = ["A","B","C"].map((letter, i) => ({
              Text: cols[3 + i].trim(),
              correct: cols[6].trim().toUpperCase() === letter
          }));

          allQuestions.push({
              question: cols[0].trim(),
              image: cols[1].trim(),
              category: cols[2].trim(),
              answer: answers
          });
      });

      // Start quiz met volledige vragenlijst
      resetToFullQuiz();
  });

//-----------------------------------------------------------
// 4. Hulpfuncties
//-----------------------------------------------------------

// UI reset voor nieuwe vraag
function resetState() {
    answerButtons.innerHTML = "";
    questionElement.innerHTML = "";
    qimg.style.display = "none";
    nextButton.style.display = "none";
}

// Start volledige quiz (alle vragen)
function resetToFullQuiz() {
    questions = [...allQuestions];
    answeredQuestions = Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    isRetryRound = false;
    showQuestion();
}

// Score bijwerken
function updateScore() {
    const correct = answeredQuestions.filter(x => x === true).length;
    const wrong = answeredQuestions.filter(x => x === false).length;
    const total = correct + wrong;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    scoreElement.innerHTML = `Juist: ${correct} | Fout: ${wrong} | Percentage: ${pct}%`;
}

//-----------------------------------------------------------
// 5. Vraag tonen
//-----------------------------------------------------------
function showQuestion() {
    resetState();

    const q = questions[currentQuestionIndex];
    questionElement.innerHTML =
        `<span class="question-label">${currentQuestionIndex + 1}</span> ${q.question}`;

    if (q.category.toUpperCase() === "AANDACHT") {
        const alertImg = document.createElement("img");
        alertImg.src = "./Images/opgelet.JPG";
        alertImg.classList.add("alert-image");
        questionElement.prepend(alertImg);
    }

    if (q.image) {
        qimg.src = q.image;
        qimg.style.display = "block";
    }

    q.answer.forEach((answer, i) => {
        const btn = document.createElement("button");
        btn.classList.add("btn");
        btn.dataset.correct = answer.correct;
        btn.innerHTML = `<span class="answer-label">${String.fromCharCode(65+i)}</span> ${answer.Text}`;
        btn.addEventListener("click", selectAnswer);
        answerButtons.appendChild(btn);
    });

    updateScore();
}

//-----------------------------------------------------------
// 6. Antwoord selecteren
//-----------------------------------------------------------
function selectAnswer(e) {
    const selectedBtn = e.target.closest("button");
    const isCorrect = selectedBtn.dataset.correct === "true";

    // Bewaar antwoord
    answeredQuestions[currentQuestionIndex] = isCorrect;

    // Knoppen kleuren
    Array.from(answerButtons.children).forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === "true") btn.classList.add("correct");
    });
    if (!isCorrect) selectedBtn.classList.add("incorrect");

    updateScore();

    // Volgende-knop tonen, maar click handler blijft ongewijzigd
    nextButton.style.display = "block";
    nextButton.textContent = "Volgende";
}

//-----------------------------------------------------------
// 7. Volgende knop handler
//-----------------------------------------------------------
nextButton.addEventListener("click", () => {
    // Check of dit de “Opnieuw”-modus is
    if (nextButton.dataset.restart === "true") {
        resetToFullQuiz();
        nextButton.dataset.restart = ""; // reset flag
        nextButton.textContent = "Volgende";
        return;
    }

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        handleQuizEnd();
    }
});


//-----------------------------------------------------------
// 8. Quiz einde → foutvragen opnieuw of volledige reset
//-----------------------------------------------------------
function handleQuizEnd() {
    const sourceQuestions = isRetryRound ? questions : allQuestions;

    // Verzamel foutvragen
    let wrongQuestions = [];
    sourceQuestions.forEach((q, idx) => {
        if (answeredQuestions[idx] === false) wrongQuestions.push(q);
    });

    if (wrongQuestions.length === 0) {
        // Alles correct → Opnieuw-knop tonen
        questionElement.innerHTML = "<h2>Alle vragen correct! 🎉</h2>";
        answerButtons.innerHTML = "";

        nextButton.style.display = "block";
        nextButton.textContent = "Opnieuw (alle vragen)";

        // Nieuw: markeer dat de knop nu Opnieuw moet doen
        nextButton.dataset.restart = "true";

        return;
    }

    // Start foutvragen-ronde
    questions = [...wrongQuestions];
    answeredQuestions = Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    isRetryRound = true;

    showQuestion(); // Volgende-knop verschijnt normaal via selectAnswer()
}


//-----------------------------------------------------------
// 9. STOP-knop → toon alleen foutvragen
//-----------------------------------------------------------
stopButton.onclick = () => {
    let wrongQuestions = [];
    answeredQuestions.forEach((ans, idx) => {
        if (ans === false) wrongQuestions.push(questions[idx]);
    });

    if (wrongQuestions.length === 0) {
        alert("Geen foutvragen. Start volledige quiz.");
        resetToFullQuiz();
        return;
    }

    questions = [...wrongQuestions];
    answeredQuestions = Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    isRetryRound = true;

    showQuestion(); // Volgende-knop verschijnt zoals normaal via selectAnswer()
};

//-----------------------------------------------------------
// 10. Jump naar vraag
//-----------------------------------------------------------
jumpBtn.addEventListener("click", () => {
    const num = parseInt(jumpInput.value);
    if (!isNaN(num) && num > 0 && num <= questions.length) {
        currentQuestionIndex = num - 1;
        showQuestion();
    } else {
        alert("Geen geldige vraag: " + num);
    }
});

//-----------------------------------------------------------
// 11. Opnieuw-knop → altijd volledige quiz herstarten
//-----------------------------------------------------------
restartButton.onclick = () => resetToFullQuiz();
