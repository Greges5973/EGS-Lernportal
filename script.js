const SUPABASE_URL =
"https://fifwkutfqwggzyoksfwy.supabase.co";

const SUPABASE_ANON_KEY =
"sb_publishable_wZreIW3evrVyVh3BmSombA_xpv3yHNR";

const { createClient } = supabase;

const db = createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);



const $ = (id) =>
document.getElementById(id);

const authContainer =
$("authContainer");

const appContainer =
$("appContainer");

const loginSection =
$("loginSection");

const registerSection =
$("registerSection");

const loginForm =
$("loginForm");

const registerForm =
$("registerForm");

const loginMessage =
$("loginMessage");

const registerMessage =
$("registerMessage");

const adminNavButton =
$("adminNavButton");

const adminWelcomeCard =
$("adminWelcomeCard");

let formulas = [];

let currentUser = null;
let currentUserIsAdmin = false;
let currentUserCreatedAt = null; // Merkt sich den Zeitpunkt der Kontoerstellung für die Kalendergrenze.
const questionStartTimes = new Map();
let calendarCurrentDate = new Date();

let examState = null;

let examTimerId = null;

// ========================= HILFSFUNKTIONEN =========================

function setMessage(
element,
message,
type = "error"
) {


if (!element) {
    return;
}

element.textContent =
    message || "";

element.classList.toggle(
    "success-message",
    type === "success"
);


}

function escapeHtml(value) {


return String(value ?? "")
    .replace(
        /[&<>"']/g,
        (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );


}

function formatNumber(
value,
maximumFractionDigits = 8
) {


return Number(value)
    .toLocaleString(
        "de-DE",
        {
            maximumFractionDigits
        }
    );


}

// ========================= LOGIN ANZEIGEN =========================

function showLogin() {


appContainer.classList.add(
    "hidden"
);

authContainer.classList.remove(
    "hidden"
);

loginSection.classList.remove(
    "hidden"
);

registerSection.classList.add(
    "hidden"
);

setMessage(
    loginMessage,
    ""
);


}

// ========================= SEITENNAVIGATION =========================

function showPage(pageId) {


document
    .querySelectorAll(".page")
    .forEach((page) => {

        page.classList.remove(
            "active-page"
        );

    });


const page =
    $(pageId);


if (!page) {
    return;
}


page.classList.add(
    "active-page"
);


    if (currentUser && pageId !== "impressumPage" && pageId !== "privacyPage") {
        db.from("page_views").insert({
            user_id: currentUser.id,
            page: pageId
        }).then(({ error }) => {
            if (error) console.error("SEITENAUFRUF FEHLER:", error);
        });
    }


document
    .querySelectorAll(
        ".nav-button[data-page]"
    )
    .forEach((button) => {

        button.classList.toggle(
            "active",
            button.dataset.page ===
                pageId
        );

    });


if (
    pageId ===
    "formulasPage"
) {

    loadFormulas();

}


if (
    pageId ===
    "learningPage"
) {

    loadQuestions();

}

if (
    pageId ===
    "statisticsPage"
) {

    loadStatistics();

}

if (
    pageId ===
    "calendarPage"
) {

    loadCalendar();

}

if (
    pageId ===
    "examPage"
) {

    loadExamPage();

}

if (
    pageId ===
    "calculatorPage"
) {

    loadCalculators();
}

if (
    pageId ===
    "dashboardPage"
) {

    loadDashboardSummary(); // Lädt die echte Dashboard-Lernserie und die Lernübersicht.
}

if (
    pageId ===
    "adminPage"
) {

    loadAdminUsers(); // Lädt die Benutzerverwaltung.
    loadAdminQuestions(); // Lädt Fragen, Themen und Unterthemen.
    loadAdminCalculators(); // Lädt die Rechnerverwaltung.
    loadAdminFormulas(); // Lädt die Formelsammlung.
    loadAdminExams(); // Lädt die Prüfungsverwaltung.
    loadAdminStatistics(); // Lädt die Admin-Statistik.
    if (!document.querySelector(".admin-panel[open]")) openAdminSection("adminUsersSection"); // Öffnet beim ersten Admin-Aufruf den ersten Bereich.
}


}

// ========================= PORTAL ÖFFNEN =========================

async function openPortal(user) {


try {

    const {
        data: profile,
        error
    } = await db
        .from("profiles")
        .select(
            "id, username, is_admin, created_at"
        )
        .eq(
            "id",
            user.id
        )
        .maybeSingle();


    if (error) {

        throw new Error(
            "Das Profil konnte nicht geladen werden. " +
            "Supabase meldet: " +
            error.message
        );

    }


    if (!profile) {

        throw new Error(
            "Der Login war erfolgreich, " +
            "aber für diesen Benutzer wurde " +
            "kein Profil gefunden. " +
            "Bitte prüfe in Supabase, ob in " +
            "public.profiles ein Datensatz " +
            "mit dieser Benutzer-ID existiert."
        );

    }


    currentUser =
        user;

    currentUserCreatedAt = profile.created_at || null; // Speichert den persönlichen Start des Kalenders.
    examState = null; // Verhindert, dass eine laufende Prüfung eines vorherigen Kontos weiterverwendet wird.
    stopExamTimer(); // Stoppt einen eventuell noch laufenden Timer beim Kontowechsel.


    $("dashboardUsername")
        .textContent =
        profile.username ||
        "Benutzer";


    $("settingsUsername")
        .textContent =
        profile.username ||
        "-";


    $("settingsEmail")
        .textContent =
        user.email ||
        "-";


    $("settingsUserId")
        .textContent =
        user.id ||
        "-";


    const isAdmin =
        profile.is_admin === true;


    currentUserIsAdmin =
        isAdmin;


    adminNavButton.classList.toggle(
        "hidden",
        !isAdmin
    );


    adminWelcomeCard.classList.toggle(
        "hidden",
        !isAdmin
    );


    // * WICHTIG: * Das Portal wird zuerst angezeigt. * Das Laden der Formeln darf den Login * nicht blockieren.

    authContainer.classList.add(
        "hidden"
    );

    appContainer.classList.remove(
        "hidden"
    );


    showPage(
        "dashboardPage"
    );


    loadFormulas();


} catch (error) {

    console.error(
        "PORTAL FEHLER:",
        error
    );


    setMessage(
        loginMessage,
        error.message
    );


    authContainer.classList.remove(
        "hidden"
    );

    appContainer.classList.add(
        "hidden"
    );

}


}



// LOGIN / REGISTRIERUNG =========================

$("showRegisterButton")
.addEventListener(
"click",
() => {


        loginSection.classList.add(
            "hidden"
        );

        registerSection.classList.remove(
            "hidden"
        );

        setMessage(
            loginMessage,
            ""
        );

        setMessage(
            registerMessage,
            ""
        );

    }
);


$("showLoginButton")
.addEventListener(
"click",
() => {


        registerSection.classList.add(
            "hidden"
        );

        loginSection.classList.remove(
            "hidden"
        );

        setMessage(
            loginMessage,
            ""
        );

        setMessage(
            registerMessage,
            ""
        );

    }
);


// ========================= REGISTRIERUNG =========================

registerForm.addEventListener(
"submit",
async (event) => {


    event.preventDefault();


    setMessage(
        registerMessage,
        "Konto wird erstellt ..."
    );


    const username =
        $("registerUsername")
            .value
            .trim();


    const email =
        $("registerEmail")
            .value
            .trim();


    const password =
        $("registerPassword")
            .value;


    try {

        const {
            data,
            error
        } = await db.auth.signUp({

            email,

            password,

            options: {
                data: {
                    username
                }
            }

        });


        if (error) {
            throw error;
        }


        registerForm.reset();


        if (
            data.session &&
            data.user
        ) {

            await openPortal(
                data.user
            );

        } else {

            setMessage(
                registerMessage,
                "Konto erstellt. Bitte bestätige zuerst deine E-Mail-Adresse.",
                "success"
            );

        }


    } catch (error) {

        console.error(
            "REGISTRIERUNGSFEHLER:",
            error
        );


        setMessage(
            registerMessage,
            "Fehler: " +
                error.message
        );

    }

}


);

// ========================= LOGIN =========================

loginForm.addEventListener(
"submit",
async (event) => {
    event.preventDefault();
    setMessage(loginMessage, "Anmeldung läuft ...");
    const loginValue = $("loginEmail").value.trim(); // Nimmt E-Mail oder Benutzername aus dem Loginfeld.
    const password = $("loginPassword").value; // Liest das Passwort.
    if (!loginValue || !password) {
        setMessage(loginMessage, "Bitte Benutzername/E-Mail und Passwort eingeben."); // Verhindert leere Loginanfragen.
        return;
    }
    try {
        let user = null;
        if (loginValue.includes("@")) { // Verwendet bei einer E-Mail den normalen Supabase-Login.
            const { data, error } = await db.auth.signInWithPassword({ email: loginValue, password }); // Meldet per E-Mail an.
            if (error) throw error; // Übernimmt Authentifizierungsfehler.
            user = data.user; // Übernimmt den angemeldeten Benutzer.
        } else {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/login-with-username`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ username: loginValue, password })
            }); // Ruft die öffentliche Login-Function ohne Authorization-Header auf.
            const data = await response.json().catch(() => ({})); // Liest die Antwort der Function.
            if (!response.ok) throw new Error(data?.error || "Benutzername oder Passwort ist falsch."); // Übernimmt den Fehler der Function.
            if (!data?.session) throw new Error("Benutzername oder Passwort ist falsch."); // Verhindert unvollständige Loginantworten.
            const { data: sessionData, error: sessionError } = await db.auth.setSession(data.session); // Übernimmt die serverseitig erzeugte Sitzung.
            if (sessionError) throw sessionError; // Übernimmt Sitzungsfehler.
            user = sessionData.user; // Übernimmt den angemeldeten Benutzer.
        }
        if (!user) throw new Error("Es konnte kein Benutzer angemeldet werden."); // Prüft das Ergebnis.
        await openPortal(user); // Öffnet das Portal nach erfolgreichem Login.
    } catch (error) {
        console.error("LOGIN FEHLER:", error); // Schreibt technische Details in die Konsole.
        setMessage(loginMessage, "Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben."); // Verhindert unnötige Hinweise zur Benutzerexistenz.
    }
}
);

// ========================= LOGOUT =========================

$("logoutButton")
.addEventListener(
"click",
async () => {


        const {
            error
        } = await db.auth.signOut();


        if (error) {

            console.error(
                "LOGOUT FEHLER:",
                error
            );

            return;

        }


        currentUser = null;
        currentUserIsAdmin = false;
        currentUserCreatedAt = null;
        examState = null; // Löscht eine laufende Prüfung beim Abmelden.
        stopExamTimer(); // Stoppt den Prüfungs-Timer beim Abmelden.

        showLogin();

    }
);


// ========================= NAVIGATION =========================

document
.querySelectorAll(
"[data-page]"
)
.forEach((button) => {


    button.addEventListener(
        "click",
        () => {

            const pageId =
                button.dataset.page;


            if (
                pageId ===
                "adminPage"
            ) {

                openAdminPage();

                return;

            }


            showPage(
                pageId
            );

        }
    );

});

// ========================= FRAGEN =========================

// Fragen-Hilfsfunktionen: vereinheitlichen Fragetypen, Antworten und Bilder. 
function normalizeFreeTextAnswer(value) { return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/g, ""); } // Vereinheitlicht Freitext für die automatische Bewertung.
function isFreeTextAnswerCorrect(answer, expected) { const actual = normalizeFreeTextAnswer(answer); const variants = String(expected ?? "").split(/\r?\n/).map(normalizeFreeTextAnswer).filter(Boolean); return Boolean(actual) && variants.includes(actual); } // Vergleicht die Antwort mit allen erlaubten Varianten.
function shuffleArray(items) { return [...items].sort(() => Math.random() - 0.5); } // Mischt Fragen und Antworten für jede neue Lernrunde.
function getAnswerOptions(question) { return shuffleArray(["a", "b", "c", "d"].filter((letter) => String(question[`answer_${letter}`] || "").trim())); } // Erzeugt die zufällige Reihenfolge der vorhandenen Antworten.
function getQuestionImageUrl(imagePath) { if (!imagePath) return ""; if (/^https?:\/\//i.test(imagePath)) return imagePath; return db.storage.from("question-images").getPublicUrl(imagePath).data.publicUrl; } // Baut die Bild-URL aus dem Storage-Pfad.

async function loadQuestions() { // Lädt die normale Lernstrecke mit Multiple-Choice und Freitextfragen.
    const page = $("learningPage"); // Bereich der normalen Fragen.
    const container = $("questionsContainer"); // Container für die aktuelle Lernfrage.
    if (!page || !container) return; // Bricht ab, wenn der Fragenbereich fehlt.
    questionStartTimes.clear(); // Entfernt alte Zeitmessungen.
    container.className = "placeholder-card"; // Setzt den Standardkartenstil.
    container.innerHTML = `<div class="placeholder-icon">▤</div><h2>Fragen werden geladen ...</h2><p>Bitte einen Moment warten.</p>`; // Zeigt den Ladezustand.
    try {
        const { data, error } = await db.from("questions").select("id,category,topic,question,answer_a,answer_b,answer_c,answer_d,correct_answer,explanation,difficulty,exam_part,question_type,free_text_answer,image_path").order("id"); // Holt alle Fragen inklusive Fragetyp und Bild.
        if (error) throw error; // Bricht bei Datenbankfehlern ab.
        if (!data || !data.length) { // Behandelt eine leere Fragenbank.
            container.className = "placeholder-card";
            container.innerHTML = `<div class="placeholder-icon">▤</div><h2>Noch keine Fragen vorhanden</h2><p>In der Datenbank wurden noch keine Fragen gefunden.</p>`;
            return;
        }
        const shuffledQuestions = shuffleArray(data.map((question) => ({ ...question, answerOptions: question.question_type === "multiple_choice" ? getAnswerOptions(question) : [] }))); // Mischt Fragen und Antworten für jede neue Lernrunde.
        let currentQuestionIndex = 0; // Aktuelle Position im Training.
        let sessionCorrect = 0; // Richtige Antworten dieser Session.
        let sessionAnswered = 0; // Beantwortete Fragen dieser Session.
        let sessionDuration = 0; // Lernzeit dieser Session.
        const renderQuestion = async () => { // Zeichnet eine Frage und ihre passende Antwortart.
            const question = shuffledQuestions[currentQuestionIndex]; // Aktuelle zufällige Frage.
            const questionNumber = currentQuestionIndex + 1; // Menschlich lesbare Fragennummer.
            const totalQuestions = shuffledQuestions.length; // Gesamtzahl der Fragen.
            const progressPercent = Math.round((questionNumber / totalQuestions) * 100); // Fortschrittsprozentsatz.
            const imageUrl = question.image_path ? getQuestionImageUrl(question.image_path) : ""; // Ermittelt die Bild-URL.
            const isFreeText = question.question_type === "free_text"; // Prüft den Fragetyp.
            container.className = "placeholder-card"; // Nutzt die bestehende Kartenoptik.
            container.innerHTML = `
                <div style="text-align:left;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;">
                        <span class="eyebrow">${escapeHtml(question.category || "TRAINING")}</span>
                        <strong>Frage ${questionNumber} / ${totalQuestions}</strong>
                    </div>
                    <div style="width:100%;height:8px;margin-bottom:26px;border-radius:999px;background:#071321;overflow:hidden;">
                        <div style="width:${progressPercent}%;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent-2));"></div>
                    </div>
                    <p style="margin:0 0 10px;color:var(--muted);font-size:14px;">${escapeHtml(question.topic || "Frage")}</p>
                    <h2 style="margin-top:0;">${escapeHtml(question.question)}</h2>
                    ${imageUrl ? `<div class="question-image-box"><img src="${escapeHtml(imageUrl)}" alt="Bild zur Frage"></div>` : ""}
                    ${isFreeText ? `
                        <div class="free-answer-box">
                            <label for="learningFreeAnswer">Deine Antwort</label>
                            <input id="learningFreeAnswer" class="free-answer-input" type="text" autocomplete="off" placeholder="Antwort eingeben …">
                            <button type="button" id="learningFreeAnswerButton" class="card-button">Antwort prüfen</button>
                        </div>
                    ` : `
                        <div class="answer-list" style="display:grid;gap:12px;margin-top:24px;">
                            ${question.answerOptions.map((letter, index) => `<button type="button" class="answer-button secondary-button" data-answer="${letter}">${String.fromCharCode(65 + index)}. ${escapeHtml(question[`answer_${letter}`] || "")}</button>`).join("")}
                        </div>
                    `}
                    <div id="currentQuestionResult" class="message" style="margin-top:22px;"></div>
                    <div id="questionAction" style="margin-top:18px;"></div>
                </div>
            `;
            questionStartTimes.set(Number(question.id), Date.now()); // Startet die Zeitmessung.
            const handleAnswer = async (selectedAnswer) => { // Bewertet und speichert die aktuelle Antwort.
                const answerControls = container.querySelectorAll(".answer-button, #learningFreeAnswer, #learningFreeAnswerButton"); // Sammelt alle Antwortfelder.
                answerControls.forEach((control) => { control.disabled = true; }); // Verhindert Doppelantworten.
                const startTime = questionStartTimes.get(Number(question.id)); // Liest den Startzeitpunkt.
                const duration = startTime ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : null; // Ermittelt die Bearbeitungszeit.
                const isCorrect = question.question_type === "free_text" ? isFreeTextAnswerCorrect(selectedAnswer, question.free_text_answer) : selectedAnswer === question.correct_answer; // Bewertet passend zum Fragetyp.
                sessionAnswered += 1; // Erhöht die beantwortete Anzahl.
                if (isCorrect) sessionCorrect += 1; // Zählt richtige Antworten.
                if (duration !== null) sessionDuration += duration; // Summiert die Bearbeitungszeit.
                const { error: eventError } = await db.from("learning_events").insert({ user_id: currentUser.id, event_type: "question_answered", topic: question.topic, score: isCorrect ? 1 : 0, duration: duration }); // Speichert das Lernergebnis.
                questionStartTimes.delete(Number(question.id)); // Beendet die Zeitmessung für die Frage.
                if (eventError) console.error("LERNEREIGNIS FEHLER:", eventError); // Protokolliert Speicherdfehler.
                const result = $("currentQuestionResult"); // Ergebnisbereich.
                result.innerHTML = isCorrect ? `<strong style="color:var(--success);">✓ Richtig</strong><br><span class="current-question-explanation">${escapeHtml(question.explanation || "Gut gemacht!")}</span>` : `<strong style="color:var(--danger);">✕ Falsch</strong><br><span class="current-question-explanation">${escapeHtml(question.explanation || "Siehe Erklärung zur Frage.")}</span>`; // Zeigt Ergebnis und Erklärung.
                if (question.question_type === "multiple_choice") { // Markiert Multiple-Choice-Antwort.
                    container.querySelectorAll(".answer-button").forEach((item) => item.classList.toggle("selected-answer", item.dataset.answer === selectedAnswer));
                }
                const action = $("questionAction"); // Bereich für den nächsten Schritt.
                const nextButton = document.createElement("button"); // Erstellt den nächsten Button.
                nextButton.type = "button"; // Definiert den Button als Aktion.
                nextButton.className = "card-button"; // Nutzt den Portalstil.
                const isLastQuestion = currentQuestionIndex >= shuffledQuestions.length - 1; // Prüft die letzte zufällig angeordnete Frage.
                nextButton.textContent = isLastQuestion ? "Training beenden" : "Nächste Frage →"; // Beschriftet passend.
                nextButton.addEventListener("click", () => { if (isLastQuestion) { renderCompletion(); return; } currentQuestionIndex += 1; renderQuestion(); }); // Wechselt zur nächsten Frage.
                action.innerHTML = ""; // Entfernt alte Aktionen.
                action.appendChild(nextButton); // Setzt den neuen Button ein.
            };
            container.querySelectorAll("[data-answer]").forEach((button) => { // Verbindet Multiple-Choice-Antworten.
                button.addEventListener("click", () => handleAnswer(button.dataset.answer));
            });
            const freeAnswerButton = $("learningFreeAnswerButton"); // Button für Freitext.
            const freeAnswerInput = $("learningFreeAnswer"); // Eingabefeld für Freitext.
            if (freeAnswerButton && freeAnswerInput) { // Aktiviert Freitext nur bei diesem Typ.
                const submitFreeAnswer = () => { const value = freeAnswerInput.value.trim(); if (!value) { $("currentQuestionResult").textContent = "Bitte eine Antwort eingeben."; return; } handleAnswer(value); }; // Prüft eine Freitextantwort.
                freeAnswerButton.addEventListener("click", submitFreeAnswer); // Prüft per Klick.
                freeAnswerInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); submitFreeAnswer(); } }); // Prüft per Enter.
            }
        };
        const renderCompletion = () => { // Zeigt die Zusammenfassung der Lernsession.
            const accuracy = sessionAnswered > 0 ? Math.round((sessionCorrect / sessionAnswered) * 100) : 0; // Berechnet die Trefferquote.
            const minutes = Math.floor(sessionDuration / 60); // Minutenanteil.
            const seconds = sessionDuration % 60; // Sekundenanteil.
            const timeText = minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`; // Formatiert die Zeit.
            container.className = "placeholder-card";
            container.innerHTML = `<div class="placeholder-icon">✓</div><h2>Training abgeschlossen</h2><p>Du hast ${sessionAnswered} von ${shuffledQuestions.length} Fragen beantwortet.</p><p><strong>${sessionCorrect}</strong> richtig · <strong>${sessionAnswered - sessionCorrect}</strong> falsch · <strong>${accuracy} %</strong> Trefferquote</p><p>Bearbeitungszeit: <strong>${timeText}</strong></p><button type="button" id="restartQuestionsButton" class="card-button">Noch einmal starten</button>`; // Zeichnet die Abschlusskarte.
            $("restartQuestionsButton").addEventListener("click", () => loadQuestions()); // Startet das Training neu.
        };
        renderQuestion(); // Startet mit der ersten Frage.
    } catch (error) {
        console.error("FRAGEN FEHLER:", error); // Protokolliert Fehler.
        container.className = "placeholder-card";
        container.innerHTML = `<div class="placeholder-icon">⚠</div><h2>Fragen konnten nicht geladen werden</h2><p>${escapeHtml(error.message)}</p>`; // Zeigt einen sicheren Fehlerhinweis.
    }
}

// ========================= PRÜFUNG AUS DATENBANK =========================


// ========================================================= HILFSFUNKTIONEN =========================================================

function stopExamTimer() {

    if (examTimerId) {

        clearInterval(
            examTimerId
        );

        examTimerId = null;

    }

}


function formatExamTime(
    totalSeconds
) {

    const safeSeconds =
        Math.max(
            0,
            Math.floor(
                totalSeconds
            )
        );


    const minutes =
        String(
            Math.floor(
                safeSeconds / 60
            )
        ).padStart(
            2,
            "0"
        );


    const seconds =
        String(
            safeSeconds % 60
        ).padStart(
            2,
            "0"
        );


    return `${minutes}:${seconds}`;

}


// ========================================================= PRÜFUNG LADEN =========================================================

async function loadExamPage() {

    const container =
        $("examContainer");


    if (!container) {
        return;
    }


    if (
        examState &&
        examState.status ===
            "active"
    ) {

        renderExamQuestion();

        startExamTimer();

        return;

    }


    if (
        examState &&
        examState.status ===
            "finished"
    ) {

        renderExamCompletion();

        return;

    }


    renderExamSetup();

}


// ========================================================= PRÜFUNGSSTARTSEITE =========================================================

async function renderExamSetup() {

    stopExamTimer();


    const container =
        $("examContainer");


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="exam-setup">

            <div class="exam-setup-icon">
                ▣
            </div>


            <h2>
                Prüfung auswählen
            </h2>


            <p>
                Deine Prüfungen werden direkt
                aus der Prüfungsdatenbank geladen.
            </p>


            <div class="exam-settings">

                <label>
                    Prüfungsteil

                    <select id="examPartSelect">

                        <option value="AP1">
                            AP1
                        </option>

                        <option value="AP2">
                            AP2
                        </option>

                    </select>

                </label>


                <label>
                    Prüfung

                    <select id="examSetSelect">

                        <option value="">
                            Prüfungen werden geladen ...
                        </option>

                    </select>

                </label>

            </div>


            <div
                id="examInfo"
                class="exam-info"
            ></div>


            <p
                id="examSetupMessage"
                class="message"
            ></p>


            <button
                type="button"
                id="startExamButton"
                class="card-button"
            >
                Prüfung starten →
            </button>

        </div>

    `;


    const partSelect =
        $("examPartSelect");


    const examSelect =
        $("examSetSelect");


    await loadExamSets(
        partSelect.value
    );


    partSelect.addEventListener(
        "change",
        async () => {

            await loadExamSets(
                partSelect.value
            );

        }
    );


    examSelect.addEventListener(
        "change",
        () => {

            showSelectedExamInfo();

        }
    );


    $("startExamButton")
        .addEventListener(
            "click",
            startExam
        );

}


// ========================================================= PRÜFUNGEN AUS DATENBANK LADEN =========================================================

async function loadExamSets(
    examPart
) {

    const examSelect =
        $("examSetSelect");


    const message =
        $("examSetupMessage");


    if (!examSelect) {
        return;
    }


    examSelect.innerHTML = `
        <option value="">
            Prüfungen werden geladen ...
        </option>
    `;


    try {

        const {
            data,
            error
        } = await db
            .from("exam_sets")
            .select(`
                id,
                title,
                exam_part,
                description,
                duration_minutes,
                is_active
            `)
            .eq(
                "exam_part",
                examPart
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "created_at"
            );


        if (error) {
            throw error;
        }


        const exams =
            data || [];


        if (
            exams.length ===
            0
        ) {

            examSelect.innerHTML = `
                <option value="">
                    Keine Prüfung vorhanden
                </option>
            `;


            setMessage(
                message,
                `Für ${examPart} ist momentan keine Prüfung angelegt.`
            );


            $("examInfo").innerHTML =
                "";

            return;

        }


        examSelect.innerHTML = `

            <option value="">
                Prüfung auswählen ...
            </option>

            ${
                exams
                    .map(
                        (exam) => `

                            <option
                                value="${exam.id}"
                            >
                                ${escapeHtml(
                                    exam.title
                                )}
                            </option>

                        `
                    )
                    .join("")
            }

        `;


        examSelect._examData =
            exams;


        setMessage(
            message,
            ""
        );


        showSelectedExamInfo();


    } catch (error) {

        console.error(
            "PRÜFUNGEN FEHLER:",
            error
        );


        examSelect.innerHTML = `
            <option value="">
                Fehler beim Laden
            </option>
        `;


        setMessage(
            message,
            "Prüfungen konnten nicht geladen werden: " +
                error.message
        );

    }

}


// ========================================================= GEWÄHLTE PRÜFUNG ANZEIGEN =========================================================

async function showSelectedExamInfo() {

    const examSelect =
        $("examSetSelect");


    const info =
        $("examInfo");


    if (
        !examSelect ||
        !info
    ) {
        return;
    }


    const examId =
        Number(
            examSelect.value
        );


    if (!examId) {

        info.innerHTML =
            "";

        return;

    }


    const exams =
        examSelect._examData ||
        [];


    const exam =
        exams.find(
            (item) =>
                Number(item.id) ===
                examId
        );


    if (!exam) {
        return;
    }


    try {

        const {
            count,
            error
        } = await db
            .from(
                "exam_set_questions"
            )
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "exam_id",
                examId
            );


        if (error) {
            throw error;
        }


        const duration =
            exam.duration_minutes
                ? `${exam.duration_minutes} Minuten`
                : "Unbegrenzt";


        info.innerHTML = `

            <div class="exam-info-grid">

                <div>

                    <span>
                        Fragen
                    </span>

                    <strong>
                        ${count || 0}
                    </strong>

                </div>


                <div>

                    <span>
                        Zeit
                    </span>

                    <strong>
                        ${duration}
                    </strong>

                </div>

            </div>


            ${
                exam.description
                    ? `
                        <p>
                            ${escapeHtml(
                                exam.description
                            )}
                        </p>
                    `
                    : ""
            }

        `;

    } catch (error) {

        console.error(
            "PRÜFUNGSINFO FEHLER:",
            error
        );

        info.innerHTML = "";

    }

}


// ========================================================= PRÜFUNG STARTEN =========================================================

async function startExam() {

    const examSelect =
        $("examSetSelect");


    const message =
        $("examSetupMessage");


    const startButton =
        $("startExamButton");


    if (
        !examSelect ||
        !message ||
        !startButton
    ) {
        return;
    }


    const examId =
        Number(
            examSelect.value
        );


    if (!examId) {

        setMessage(
            message,
            "Bitte zuerst eine Prüfung auswählen."
        );

        return;

    }


    startButton.disabled =
        true;


    setMessage(
        message,
        "Prüfung wird vorbereitet ...",
        "success"
    );


    try {

        const {
            data: exam,
            error: examError
        } = await db
            .from("exam_sets")
            .select(`
                id,
                title,
                exam_part,
                description,
                duration_minutes
            `)
            .eq(
                "id",
                examId
            )
            .eq(
                "is_active",
                true
            )
            .maybeSingle();


        if (examError) {
            throw examError;
        }


        if (!exam) {

            throw new Error(
                "Die ausgewählte Prüfung wurde nicht gefunden."
            );

        }


        const {
            data: questionRows,
            error: questionError
        } = await db
            .from(
                "exam_set_questions"
            )
            .select(`
                position,
                question:questions (
                    id,
                    category,
                    topic,
                    question,
                    answer_a,
                    answer_b,
                    answer_c,
                    answer_d,
                    correct_answer,
                    explanation,
                    difficulty,
                    exam_part,
                    question_type,
                    free_text_answer,
                    image_path
                )
            `)
            .eq(
                "exam_id",
                examId
            )
            .order(
                "position"
            );


        if (questionError) {
            throw questionError;
        }


        const questions = shuffleArray((questionRows || [])
            .map((row) => ({
                position: Number(row.position),
                ...row.question,
                userAnswer: null,
                timeSpent: 0,
                enteredAt: null,
                answerOptions: row.question?.question_type === "multiple_choice" ? getAnswerOptions(row.question) : []
            }))
            .filter((question) => question.id)); // Mischt Prüfungsfragen und Antwortoptionen für jeden neuen Versuch.


        if (
            questions.length ===
            0
        ) {

            throw new Error(
                "Diese Prüfung enthält noch keine Fragen."
            );

        }


        const {
            data: attempt,
            error: attemptError
        } = await db
            .from(
                "exam_attempts"
            )
            .insert({
                user_id:
                    currentUser.id,

                exam_id:
                    exam.id,

                status:
                    "active",

                total_questions:
                    questions.length
            })
            .select(
                "id"
            )
            .single();


        if (attemptError) {
            throw attemptError;
        }


        examState = {

            status:
                "active",

            examId:
                exam.id,

            examTitle:
                exam.title,

            examPart:
                exam.exam_part,

            durationMinutes:
                exam.duration_minutes,

            attemptId:
                attempt.id,

            questions:
                questions,

            currentIndex:
                0,

            startedAt:
                Date.now(),

            finishedAt:
                null,

            timeExpired:
                false

        };


        renderExamQuestion();

        startExamTimer();


    } catch (error) {

        console.error(
            "PRÜFUNG START FEHLER:",
            error
        );


        setMessage(
            message,
            "Prüfung konnte nicht gestartet werden: " +
                error.message
        );


        startButton.disabled =
            false;

    }

}


// ========================================================= TIMER =========================================================

function startExamTimer() {

    stopExamTimer();


    examTimerId =
        setInterval(
            () => {

                if (
                    !examState ||
                    examState.status !==
                        "active"
                ) {
                    return;
                }


                const timer =
                    $("examTimer");


                if (!timer) {
                    return;
                }


                const elapsed =
                    Math.floor(
                        (
                            Date.now() -
                            examState.startedAt
                        ) / 1000
                    );


                const limit =
                    Number(
                        examState.durationMinutes ||
                            0
                    ) * 60;


                if (
                    limit > 0
                ) {

                    const remaining =
                        Math.max(
                            0,
                            limit -
                                elapsed
                        );


                    timer.textContent =
                        formatExamTime(
                            remaining
                        );


                    if (
                        remaining <=
                        0
                    ) {

                        finishExam(
                            true
                        );

                    }

                } else {

                    timer.textContent =
                        formatExamTime(
                            elapsed
                        );

                }

            },
            1000
        );

}


// ========================================================= FRAGE ZEIT SPEICHERN =========================================================

function updateCurrentQuestionTime() {

    if (
        !examState ||
        examState.status !==
            "active"
    ) {
        return;
    }


    const question =
        examState.questions[
            examState.currentIndex
        ];


    if (
        !question ||
        !question.enteredAt
    ) {
        return;
    }


    const duration =
        Math.max(
            0,
            Math.round(
                (
                    Date.now() -
                    question.enteredAt
                ) / 1000
            )
        );


    question.timeSpent =
        Number(
            question.timeSpent || 0
        ) + duration;


    question.enteredAt =
        Date.now();

}


// ========================================================= FRAGE ANZEIGEN =========================================================

function renderExamQuestion() { // Zeichnet eine Prüfungsfrage mit Multiple-Choice oder Freitext.
    if (!examState || examState.status !== "active") return; // Nur aktive Prüfungen anzeigen.
    const container = $("examContainer"); // Prüfungscontainer.
    const question = examState.questions[examState.currentIndex]; // Aktuelle Frage.
    if (!container || !question) return; // Abbruch bei fehlenden Daten.
    question.enteredAt = Date.now(); // Startet die Zeitmessung.
    const questionNumber = examState.currentIndex + 1; // Fragennummer.
    const totalQuestions = examState.questions.length; // Gesamtzahl.
    const progress = Math.round((questionNumber / totalQuestions) * 100); // Fortschritt.
    const isFreeText = question.question_type === "free_text"; // Fragetyp prüfen.
    const imageUrl = question.image_path ? getQuestionImageUrl(question.image_path) : ""; // Bild-URL.
    container.innerHTML = `
        <div class="exam-active">
            <div class="exam-topline">
                <div>
                    <span class="eyebrow">${escapeHtml(examState.examPart)}</span>
                    <strong>${escapeHtml(examState.examTitle)}</strong>
                    <span class="exam-question-counter">Frage ${questionNumber} / ${totalQuestions}</span>
                </div>
                <div class="exam-timer-box"><span>Zeit</span><strong id="examTimer">--:--</strong></div>
            </div>
            <div class="exam-progress"><div class="exam-progress-bar" style="width:${progress}%"></div></div>
            <p class="exam-topic">${escapeHtml(question.category || "")}${question.topic ? ` · ${escapeHtml(question.topic)}` : ""}</p>
            <h2>${escapeHtml(question.question)}</h2>
            ${imageUrl ? `<div class="question-image-box"><img src="${escapeHtml(imageUrl)}" alt="Bild zur Prüfungsfrage"></div>` : ""}
            ${isFreeText ? `
                <div class="free-answer-box">
                    <label for="examFreeAnswer">Deine Antwort</label>
                    <input id="examFreeAnswer" class="free-answer-input" type="text" autocomplete="off" value="${escapeHtml(question.userAnswer || "")}" placeholder="Antwort eingeben …">
                </div>
            ` : `
                <div class="answer-list exam-answer-list">
                    ${question.answerOptions.map((letter, index) => `<button type="button" class="answer-button exam-answer-button ${question.userAnswer === letter ? "exam-selected" : ""}" data-exam-answer="${letter}">${String.fromCharCode(65 + index)}. ${escapeHtml(question[`answer_${letter}`] || "")}</button>`).join("")}
                </div>
            `}
            <div class="exam-navigation">
                <span id="examAnswerHint" class="exam-answer-hint">${question.userAnswer ? "Antwort ausgewählt." : (isFreeText ? "Bitte eine Antwort eingeben." : "Bitte eine Antwort auswählen.")}</span>
                <div class="exam-navigation-actions">
                    <button type="button" id="examBackButton" class="secondary-button" ${questionNumber === 1 ? "disabled" : ""}>← Zurück</button>
                    <button type="button" id="examNextButton" class="card-button">${questionNumber === totalQuestions ? "Prüfung abgeben" : "Weiter →"}</button>
                </div>
            </div>
        </div>
    `;
    if (!question.userAnswer) question.enteredAt = Date.now(); // Startet die Zeit nur beim ersten Anzeigen ohne bestehende Antwort.
    container.querySelectorAll("[data-exam-answer]").forEach((button) => { button.addEventListener("click", () => { question.userAnswer = button.dataset.examAnswer; container.querySelectorAll("[data-exam-answer]").forEach((item) => item.classList.toggle("exam-selected", item.dataset.examAnswer === question.userAnswer)); const hint = $("examAnswerHint"); if (hint) hint.textContent = "Antwort ausgewählt."; }); }); // Verbindet Multiple-Choice.
    const freeInput = $("examFreeAnswer"); // Freitextfeld.
    if (freeInput) freeInput.addEventListener("input", () => { question.userAnswer = freeInput.value; const hint = $("examAnswerHint"); if (hint) hint.textContent = question.userAnswer.trim() ? "Antwort eingetragen." : "Bitte eine Antwort eingeben."; }); // Speichert die Eingabe lokal im Prüfungsstatus.
    $("examBackButton").addEventListener("click", async () => { if (examState.currentIndex <= 0) return; updateCurrentQuestionTime(); if (String(question.userAnswer ?? "").trim()) await saveExamAnswer(question); examState.currentIndex -= 1; renderExamQuestion(); }); // Geht zur vorherigen Frage und speichert die aktuelle Antwort.
    $("examNextButton").addEventListener("click", async () => { const answerValue = String(question.userAnswer ?? "").trim(); if (!answerValue) { const hint = $("examAnswerHint"); if (hint) hint.textContent = isFreeText ? "Bitte zuerst eine Antwort eingeben." : "Bitte zuerst eine Antwort auswählen."; return; } updateCurrentQuestionTime(); await saveExamAnswer(question); if (examState.currentIndex >= examState.questions.length - 1) { await finishExam(false); return; } examState.currentIndex += 1; renderExamQuestion(); }); // Speichert und wechselt weiter oder gibt die Prüfung ab.
}

// ========================================================= EINZELNE ANTWORT SPEICHERN =========================================================

async function saveExamAnswer(
    question
) {

    if (
        !examState ||
        !examState.attemptId
    ) {
        return;
    }


    const answer =
        question.userAnswer;


    const isCorrect =
        question.question_type === "free_text"
            ? isFreeTextAnswerCorrect(answer, question.free_text_answer)
            : answer === question.correct_answer; // Bewertet den jeweiligen Fragetyp.


    try {

        const {
            error
        } = await db
            .from(
                "exam_attempt_answers"
            )
            .upsert({

                attempt_id:
                    examState.attemptId,

                question_id:
                    question.id,

                position:
                    question.position,

                selected_answer:
                    answer,

                correct_answer:
                    question.correct_answer,

                is_correct:
                    isCorrect,

                duration:
                    Number(
                        question.timeSpent ||
                            0
                    ),

                question_snapshot: {

                    id:
                        question.id,

                    category:
                        question.category,

                    topic:
                        question.topic,

                    question:
                        question.question,

                    answer_a:
                        question.answer_a,

                    answer_b:
                        question.answer_b,

                    answer_c:
                        question.answer_c,

                    answer_d:
                        question.answer_d,

                    correct_answer:
                        question.correct_answer,

                    explanation:
                        question.explanation,

                    question_type:
                        question.question_type,

                    free_text_answer:
                        question.free_text_answer,

                    image_path:
                        question.image_path

                }

            });


        if (error) {

            console.error(
                "PRÜFUNGSANTWORT FEHLER:",
                error
            );

        }

    } catch (error) {

        console.error(
            "PRÜFUNGSANTWORT FEHLER:",
            error
        );

    }

}


// ========================= IHK NOTENSCHLÜSSEL =========================

function getIhkGrade(points) { // Wandelt 0 bis 100 Punkte in die IHK-Notenbereiche um.
    const value = Math.min(100, Math.max(0, Math.round(Number(points) || 0))); // Begrenzung auf gültige Punkte.
    if (value >= 92) return { grade: 1, label: "sehr gut", passed: true }; // 92 bis 100 Punkte.
    if (value >= 81) return { grade: 2, label: "gut", passed: true }; // 81 bis 91 Punkte.
    if (value >= 67) return { grade: 3, label: "befriedigend", passed: true }; // 67 bis 80 Punkte.
    if (value >= 50) return { grade: 4, label: "ausreichend", passed: true }; // 50 bis 66 Punkte.
    if (value >= 30) return { grade: 5, label: "mangelhaft", passed: false }; // 30 bis 49 Punkte.
    return { grade: 6, label: "ungenügend", passed: false }; // 0 bis 29 Punkte.
}

// ========================================================= PRÜFUNG BEENDEN =========================================================

async function finishExam(
    timeExpired = false
) {

    if (
        !examState ||
        examState.status !==
            "active"
    ) {
        return;
    }


    updateCurrentQuestionTime();

    stopExamTimer();


    const unanswered =
        examState.questions.filter(
            (question) =>
                !String(question.userAnswer ?? "").trim()
        );


    const answered =
        examState.questions.filter(
            (question) =>
                String(question.userAnswer ?? "").trim()
        );


    const correct =
        answered.filter(
            (question) =>
                question.question_type === "free_text"
                    ? isFreeTextAnswerCorrect(question.userAnswer, question.free_text_answer)
                    : question.userAnswer === question.correct_answer
        );


    const accuracy =
        answered.length > 0
            ? Math.round(
                  (
                      correct.length /
                      answered.length
                  ) *
                      100
              )
            : 0;


    examState.status =
        "finished";


    examState.finishedAt =
        Date.now();


    examState.timeExpired =
        timeExpired;


    examState.answeredCount =
        answered.length;


    examState.correctCount =
        correct.length;


    examState.unansweredCount =
        unanswered.length;


    examState.accuracy =
        accuracy;

    examState.points = examState.questions.length > 0 ? Math.round((examState.correctCount / examState.questions.length) * 100) : 0; // Unbeantwortete Fragen zählen wie falsche Antworten.
    examState.ihkResult = getIhkGrade(examState.points); // Ermittelt Note und Bestehensstatus.


    // Letzte ausgewählte Antwort noch speichern.

    const currentQuestion =
        examState.questions[
            examState.currentIndex
        ];


    if (
        currentQuestion &&
        currentQuestion.userAnswer
    ) {

        await saveExamAnswer(
            currentQuestion
        );

    }


    try {

        const status =
            timeExpired
                ? "time_expired"
                : "finished";


        const {
            error
        } = await db
            .from(
                "exam_attempts"
            )
            .update({

                status:

                    status,

                finished_at:

                    new Date()
                        .toISOString(),

                total_questions:

                    examState.questions.length,

                answered_questions:

                    examState.answeredCount,

                correct_questions:

                    examState.correctCount,

                accuracy:

                    examState.accuracy,

                points:

                    examState.points,

                grade:

                    examState.ihkResult.grade,

                passed:

                    examState.ihkResult.passed

            })
            .eq(
                "id",
                examState.attemptId
            )
            .eq(
                "user_id",
                currentUser.id
            );


        if (error) {

            throw error;

        }

        const examLearningEvent = await db.from("learning_events").insert({ user_id: currentUser.id, event_type: "exam_completed", topic: `${examState.examPart}: ${examState.examTitle}`, score: examState.ihkResult.passed ? 1 : 0, duration: Math.max(0, Math.round((examState.finishedAt - examState.startedAt) / 1000)) }); // Zeichnet die abgeschlossene Prüfung als Lernaktivität auf.
        if (examLearningEvent.error) console.error("PRÜFUNGS-LERNEREIGNIS FEHLER:", examLearningEvent.error); // Protokolliert einen Fehler bei der Lernaktivität.


    } catch (error) {

        console.error(
            "PRÜFUNGSERGEBNIS FEHLER:",
            error
        );

        examState.saveError =
            error.message;

    }


    if (currentUser && $("statisticsPage")?.classList.contains("active-page")) await loadStatistics(); // Aktualisiert die Prüfungsstatistik sofort nach der Abgabe.

    renderExamCompletion();

}


// ========================================================= ERGEBNIS =========================================================

function renderExamCompletion() {

    stopExamTimer();


    const container =
        $("examContainer");


    if (
        !container ||
        !examState
    ) {
        return;
    }


    const totalQuestions =
        examState.questions.length;


    const totalDuration =
        Math.max(
            0,
            Math.round(
                (
                    examState.finishedAt -
                    examState.startedAt
                ) / 1000
            )
        );


    container.innerHTML = `

        <div
            class="exam-completion"
        >

            <div
                class="exam-setup-icon"
            >
                ✓
            </div>


            <h2>

                ${
                    examState.timeExpired
                        ? "Zeit abgelaufen"
                        : "Prüfung abgeschlossen"
                }

            </h2>


            <p>

                ${escapeHtml(
                    examState.examTitle
                )}

            </p>


            <div
                class="exam-result-grid"
            >

                <div>

                    <span>
                        Richtig
                    </span>

                    <strong>
                        ${examState.correctCount}
                    </strong>

                </div>


                <div>

                    <span>
                        Falsch
                    </span>

                    <strong>

                        ${
                            examState.answeredCount -
                            examState.correctCount
                        }

                    </strong>

                </div>


                <div>

                    <span>
                        Offen
                    </span>

                    <strong>
                        ${examState.unansweredCount}
                    </strong>

                </div>


                <div>

                    <span>
                        Trefferquote
                    </span>

                    <strong>
                        ${examState.accuracy} %
                    </strong>

                </div>

            </div>


            <div class="exam-result-ihk ${examState.ihkResult?.passed ? "exam-result-passed" : "exam-result-failed"}">
                <span>IHK-Ergebnis</span>
                <strong>${examState.points} Punkte · Note ${examState.ihkResult?.grade ?? "–"}</strong>
                <em>${escapeHtml(examState.ihkResult?.label || "–")} · ${examState.ihkResult?.passed ? "BESTANDEN" : "NICHT BESTANDEN"}</em>
            </div>


            <p>

                Bearbeitungszeit:

                <strong>
                    ${formatExamTime(
                        totalDuration
                    )}
                </strong>

            </p>


            ${
                examState.saveError
                    ? `

                        <p class="message">

                            Das Prüfungsergebnis
                            konnte nicht vollständig
                            gespeichert werden.

                            ${escapeHtml(
                                examState.saveError
                            )}

                        </p>

                    `
                    : ""
            }


            <h3>
                Auswertung
            </h3>


            <div
                class="exam-review-list"
            >

                ${
                    examState.questions
                        .map(
                            (
                                question,
                                index
                            ) => {

                                const answered =
                                    Boolean(
                                        question.userAnswer
                                    );


                                const correct =
                                    answered &&
                                    question.userAnswer ===
                                        question.correct_answer;


                                const userAnswer =
                                    question.userAnswer
                                        ? question[
                                              `answer_${question.userAnswer}`
                                          ]
                                        : "Nicht beantwortet";


                                const correctAnswer =
                                    question[
                                        `answer_${question.correct_answer}`
                                    ];


                                return `

                                    <article
                                        class="
                                            exam-review-item
                                            ${
                                                correct
                                                    ? "exam-review-correct"
                                                    : "exam-review-wrong"
                                            }
                                        "
                                    >

                                        <strong>
                                            Frage
                                            ${index + 1}
                                        </strong>


                                        <p>

                                            ${escapeHtml(
                                                question.question
                                            )}

                                        </p>


                                        <p>

                                            Deine Antwort:

                                            <strong>

                                                ${escapeHtml(
                                                    userAnswer
                                                )}

                                            </strong>

                                        </p>


                                        <p>

                                            Richtige Antwort:

                                            <strong>

                                                ${escapeHtml(
                                                    correctAnswer
                                                )}

                                            </strong>

                                        </p>


                                        <p>

                                            ${escapeHtml(
                                                question.explanation ||
                                                "Keine Erklärung vorhanden."
                                            )}

                                        </p>

                                    </article>

                                `;

                            }
                        )
                        .join("")
                }

            </div>


            <button
                type="button"
                id="restartExamButton"
                class="card-button"
            >
                Zum Prüfungsmenü
            </button>

        </div>

    `;


    $("restartExamButton")
        .addEventListener(
            "click",
            () => {

                examState =
                    null;

                renderExamSetup();

            }
        );

}


function renderSevenDayStreak(activeDays, countId, gridId) { // Zeichnet die letzten sieben Kalendertage und die aktuelle Serie.
    const countElement = $(countId); // Anzeige der Serienlänge.
    const gridElement = $(gridId); // Sieben Tageskreise.
    if (!countElement || !gridElement) return; // Bricht ab, wenn der Zielbereich fehlt.
    const today = new Date(); // Heutiges Datum.
    const todayKey = getCalendarDateKey(today); // Heutiger Datumsschlüssel.
    let streak = 0; // Zählt die aktuelle lückenlose Serie.
    let startOffset = activeDays.has(todayKey) ? 0 : 1; // Beginnt heute oder, falls heute noch nicht gelernt wurde, bei gestern.
    for (let offset = startOffset; offset < 366; offset += 1) { const date = new Date(today); date.setDate(today.getDate() - offset); const key = getCalendarDateKey(date); if (activeDays.has(key)) streak += 1; else break; } // Zählt die zusammenhängenden Lerntage rückwärts.
    countElement.textContent = `${streak} ${streak === 1 ? "Tag" : "Tage"} in Folge`; // Zeigt die Serienlänge.
    gridElement.innerHTML = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); const key = getCalendarDateKey(date); const learned = activeDays.has(key); const isToday = key === todayKey; const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date).slice(0, 2); const dayNumber = date.getDate(); return `<div class="dashboard-streak-day ${learned ? "learned" : ""} ${isToday ? "today" : ""}"><span>${escapeHtml(weekday)}</span><strong>${learned ? "🔥" : "•"}</strong><small>${dayNumber}.${String(date.getMonth() + 1).padStart(2, "0")}.</small></div>`; }).join(""); // Zeichnet die sieben Tage von alt nach neu.
}

async function loadDashboardSummary() { // Lädt Lernzahlen und die letzten sieben Lerntage für das Dashboard.
    if (!currentUser) return; // Ohne Benutzer keine persönlichen Daten laden.
    const answeredEl = $("dashboardAnswered"); // Anzahl beantworteter Lernfragen.
    const accuracyEl = $("dashboardAccuracy"); // Trefferquote.
    const timeEl = $("dashboardLearningTime"); // Lernzeit.
    if (!answeredEl || !accuracyEl || !timeEl) return; // Erwartete Elemente fehlen.
    answeredEl.textContent = "…"; // Ladezustand.
    accuracyEl.textContent = "…"; // Ladezustand.
    timeEl.textContent = "…"; // Ladezustand.
    try {
        const { data, error } = await db.from("learning_events").select("score,duration,created_at,event_type").eq("user_id", currentUser.id).order("created_at", { ascending: false }); // Holt Lernfragen und abgeschlossene Prüfungen.
        if (error) throw error; // Bricht bei Datenbankfehlern ab.
        const events = data || []; // Leere Datenmenge sicher behandeln.
        const questionEvents = events.filter((event) => event.event_type === "question_answered"); // Trennt Lernfragen von Prüfungsabschlüssen.
        const answered = questionEvents.length; // Zählt nur beantwortete Lernfragen.
        const correct = questionEvents.filter((event) => Number(event.score) === 1).length; // Zählt richtige Lernantworten.
        const accuracy = answered ? Math.round((correct / answered) * 100) : 0; // Berechnet die Lernquote.
        const duration = questionEvents.reduce((sum, event) => sum + Number(event.duration || 0), 0); // Zählt nur Lernzeit aus Fragen.
        answeredEl.textContent = String(answered); // Zeigt die Anzahl.
        accuracyEl.textContent = `${accuracy} %`; // Zeigt die Trefferquote.
        timeEl.textContent = `${Math.round(duration / 60)} min`; // Zeigt die Lernzeit.
        const activeDays = new Set(events.map((event) => getCalendarDateKey(new Date(event.created_at)))); // Prüfungen zählen als Lerntag.
        renderSevenDayStreak(activeDays, "dashboardStreak", "dashboardStreakGrid"); // Zeichnet die Serie.
    } catch (error) {
        answeredEl.textContent = "–"; // Fehleranzeige.
        accuracyEl.textContent = "–"; // Fehleranzeige.
        timeEl.textContent = "–"; // Fehleranzeige.
        if ($("dashboardStreak")) $("dashboardStreak").textContent = "–"; // Fehleranzeige der Serie.
        if ($("dashboardStreakGrid")) $("dashboardStreakGrid").innerHTML = `<p class="message">Dashboard-Daten konnten nicht geladen werden.</p>`; // Fehlerhinweis.
    }
}

// ========================= STATISTIK =========================

async function loadStatistics() {
    const answeredElement = $("statAnswered");
    const correctElement = $("statCorrect");
    const wrongElement = $("statWrong");
    const accuracyElement = $("statAccuracy");
    const learningTimeElement = $("statLearningTime");
    const topicProgressList = $("topicProgressList");
    const examCountElement = $("statExamCount");
    const examPassedElement = $("statExamPassed");
    const examAveragePointsElement = $("statExamAveragePoints");
    const examAp1CountElement = $("statExamAp1Count");
    const examAp1PassedElement = $("statExamAp1Passed");
    const examAp1AverageElement = $("statExamAp1Average");
    const examAp2CountElement = $("statExamAp2Count");
    const examAp2PassedElement = $("statExamAp2Passed");
    const examAp2AverageElement = $("statExamAp2Average");
    const examGradeChartElement = $("examGradeChart");
    if (!answeredElement || !correctElement || !wrongElement || !accuracyElement || !learningTimeElement || !topicProgressList || !examCountElement || !examPassedElement || !examAveragePointsElement || !examAp1CountElement || !examAp1PassedElement || !examAp1AverageElement || !examAp2CountElement || !examAp2PassedElement || !examAp2AverageElement || !examGradeChartElement) return;
    [answeredElement, correctElement, wrongElement, accuracyElement, learningTimeElement, examCountElement, examPassedElement, examAveragePointsElement, examAp1CountElement, examAp1PassedElement, examAp1AverageElement, examAp2CountElement, examAp2PassedElement, examAp2AverageElement].forEach((element) => { element.textContent = "..."; }); // Zeigt Ladezustände.
    examGradeChartElement.innerHTML = "<span class=\"statistics-empty\">Wird geladen …</span>"; // Zeigt den Ladezustand des Notendiagramms.
    try {
        const { data: learningData, error: learningError } = await db.from("learning_events").select("topic,score,duration,event_type,created_at").eq("user_id", currentUser.id); // Holt alle Lernaktivitäten.
        if (learningError) throw learningError; // Bricht bei Datenbankfehlern ab.
        const events = learningData || []; // Leere Daten sicher behandeln.
        const questionEvents = events.filter((event) => event.event_type === "question_answered"); // Trennt normale Lernfragen.
        const activeDays = new Set(events.map((event) => getCalendarDateKey(new Date(event.created_at || Date.now())))); // Prüfungstage zählen als Lerntage.
        renderSevenDayStreak(activeDays, "statisticsStreak", "statisticsStreakGrid"); // Zeigt die persönliche Lernserie.
        const answered = questionEvents.length;
        const correct = questionEvents.filter((event) => Number(event.score) === 1).length;
        const wrong = answered - correct;
        const accuracy = answered > 0 ? (correct / answered) * 100 : 0;
        const totalDuration = questionEvents.reduce((sum, event) => sum + Number(event.duration || 0), 0);
        answeredElement.textContent = answered;
        correctElement.textContent = correct;
        wrongElement.textContent = wrong;
        accuracyElement.textContent = `${formatNumber(accuracy, 1)} %`;
        learningTimeElement.textContent = `${Math.round(totalDuration / 60)} min`;
        const topics = {};
        questionEvents.forEach((event) => { const topic = event.topic || "Ohne Thema"; if (!topics[topic]) topics[topic] = { total: 0, correct: 0 }; topics[topic].total += 1; if (Number(event.score) === 1) topics[topic].correct += 1; }); // Baut die Themenstatistik nur aus normalen Lernfragen.
        const topicEntries = Object.entries(topics).sort(([a], [b]) => a.localeCompare(b, "de"));
        topicProgressList.innerHTML = topicEntries.length ? topicEntries.map(([topic, values]) => { const percentage = values.total ? (values.correct / values.total) * 100 : 0; return `<article class="topic-progress-card"><div class="topic-progress-icon">⌁</div><div class="topic-progress-content"><div class="topic-progress-header"><div><h3>${escapeHtml(topic)}</h3><span>${values.correct} von ${values.total} richtig</span></div><strong>${formatNumber(percentage, 1)} %</strong></div><div class="topic-progress-bar"><div class="topic-progress-fill" style="width:${Math.min(100, Math.max(0, percentage))}%"></div></div></div></article>`; }).join("") : `<div class="placeholder-card"><h2>Noch keine Themen</h2><p>Beantworte deine ersten Fragen, damit hier dein Fortschritt erscheint.</p></div>`; // Zeichnet den Themenfortschritt.

        const { data: examData, error: examError } = await db.from("exam_attempts").select("status,total_questions,answered_questions,correct_questions,accuracy,points,grade,passed,exam_id,exam:exam_sets(exam_part,title)").eq("user_id", currentUser.id).in("status", ["finished", "time_expired"]); // Lädt abgeschlossene Prüfungen mit AP1/AP2.
        if (examError) throw examError; // Bricht bei Prüfungsfehlern ab.
        const exams = examData || [];
        const examPointsList = exams.map((exam) => Number(exam.points)).filter((points) => Number.isFinite(points));
        const examAveragePoints = examPointsList.length ? examPointsList.reduce((sum, points) => sum + points, 0) / examPointsList.length : null;
        examCountElement.textContent = String(exams.length);
        examPassedElement.textContent = String(exams.filter((exam) => exam.passed === true).length);
        examAveragePointsElement.textContent = examAveragePoints === null ? "–" : `${formatNumber(examAveragePoints, 1)} Punkte`;
        const ap1 = exams.filter((exam) => String(exam.exam?.exam_part || "").toUpperCase() === "AP1");
        const ap2 = exams.filter((exam) => String(exam.exam?.exam_part || "").toUpperCase() === "AP2");
        const partAverage = (items) => { const values = items.map((exam) => Number(exam.points)).filter((points) => Number.isFinite(points)); return values.length ? values.reduce((sum, points) => sum + points, 0) / values.length : null; }; // Berechnet den Durchschnitt eines Prüfungsteils.
        const ap1Average = partAverage(ap1);
        const ap2Average = partAverage(ap2);
        examAp1CountElement.textContent = String(ap1.length);
        examAp1PassedElement.textContent = String(ap1.filter((exam) => exam.passed === true).length);
        examAp1AverageElement.textContent = ap1Average === null ? "–" : `${formatNumber(ap1Average, 1)} Punkte`;
        examAp2CountElement.textContent = String(ap2.length);
        examAp2PassedElement.textContent = String(ap2.filter((exam) => exam.passed === true).length);
        examAp2AverageElement.textContent = ap2Average === null ? "–" : `${formatNumber(ap2Average, 1)} Punkte`;
        const gradeCounts = [1, 2, 3, 4, 5, 6].map((grade) => ({ grade, count: exams.filter((exam) => Number(exam.grade) === grade).length }));
        const maxGradeCount = Math.max(1, ...gradeCounts.map((item) => item.count));
        examGradeChartElement.innerHTML = gradeCounts.map((item) => `<div class="exam-grade-row"><span>Note ${item.grade}</span><div class="exam-grade-bar"><div class="exam-grade-fill" style="width:${Math.round((item.count / maxGradeCount) * 100)}%"></div></div><strong>${item.count}</strong></div>`).join(""); // Zeichnet die Notenverteilung.
    } catch (error) {
        console.error("STATISTIK FEHLER:", error); // Protokolliert den Fehler.
        [answeredElement, correctElement, wrongElement, accuracyElement, learningTimeElement, examCountElement, examPassedElement, examAveragePointsElement, examAp1CountElement, examAp1PassedElement, examAp1AverageElement, examAp2CountElement, examAp2PassedElement, examAp2AverageElement].forEach((element) => { element.textContent = "–"; }); // Setzt sichere Fehlerwerte.
        examGradeChartElement.innerHTML = "<span class=\"statistics-empty\">Prüfungsstatistik konnte nicht geladen werden.</span>"; // Zeigt den Statistikfehler.
    }
}
// ========================= KALENDER =========================

function getCalendarDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatCalendarDate(date) {

    return new Intl.DateTimeFormat(
        "de-DE",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(date);

}


async function loadCalendar() {

    const container =
        $("calendarContainer");

    const grid =
        $("calendarGrid");

    const title =
        $("calendarMonthTitle");

    const previousButton =
        $("calendarPrevButton");

    const nextButton =
        $("calendarNextButton");

    const todayButton =
        $("calendarTodayButton");

    const details =
        $("calendarDayDetails");


    if (
        !container ||
        !grid ||
        !title ||
        !previousButton ||
        !nextButton ||
        !todayButton ||
        !details
    ) {
        return;
    }


    const monthStart =
        new Date(
            calendarCurrentDate.getFullYear(),
            calendarCurrentDate.getMonth(),
            1,
            0,
            0,
            0,
            0
        );


    const monthEnd =
        new Date(
            calendarCurrentDate.getFullYear(),
            calendarCurrentDate.getMonth() + 1,
            1,
            0,
            0,
            0,
            0
        );


    title.textContent =
        new Intl.DateTimeFormat(
            "de-DE",
            {
                month: "long",
                year: "numeric"
            }
        ).format(monthStart);


    grid.innerHTML = `
        <div class="calendar-loading">
            Lernaktivitäten werden geladen ...
        </div>
    `;


    previousButton.onclick = () => {

        calendarCurrentDate =
            new Date(
                calendarCurrentDate.getFullYear(),
                calendarCurrentDate.getMonth() - 1,
                1
            );

        loadCalendar();

    };


    nextButton.onclick = () => {

        calendarCurrentDate =
            new Date(
                calendarCurrentDate.getFullYear(),
                calendarCurrentDate.getMonth() + 1,
                1
            );

        loadCalendar();

    };


    todayButton.onclick = () => {

        const today =
            new Date();

        calendarCurrentDate =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

        loadCalendar();

    };


    try {

        const {
            data,
            error
        } = await db
            .from("learning_events")
            .select(
                "created_at, score, duration, event_type, topic"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .gte(
                "created_at",
                monthStart.toISOString()
            )
            .lt(
                "created_at",
                monthEnd.toISOString()
            );


        if (error) {
            throw error;
        }


        const events =
            data || [];


        const eventsByDay =
            new Map();


        events.forEach(
            (event) => {

                const eventDate =
                    new Date(
                        event.created_at
                    );

                const key =
                    getCalendarDateKey(
                        eventDate
                    );


                if (
                    !eventsByDay.has(key)
                ) {

                    eventsByDay.set(
                        key,
                        []
                    );

                }


                eventsByDay
                    .get(key)
                    .push(event);

            }
        );


        const firstWeekday =
            (
                monthStart.getDay() + 6
            ) % 7;


        const daysInMonth =
            new Date(
                calendarCurrentDate.getFullYear(),
                calendarCurrentDate.getMonth() + 1,
                0
            ).getDate();


        const today =
            new Date();


        const todayKey =
            getCalendarDateKey(
                today
            );

        const accountCreatedKey = currentUserCreatedAt
            ? getCalendarDateKey(new Date(currentUserCreatedAt))
            : todayKey; // Tage vor der Kontoerstellung bleiben neutral.


        grid.innerHTML = "";


        // Leere Felder vor dem 1.

        for (
            let i = 0;
            i < firstWeekday;
            i += 1
        ) {

            const emptyDay =
                document.createElement(
                    "div"
                );

            emptyDay.className =
                "calendar-day calendar-empty";

            grid.appendChild(
                emptyDay
            );

        }


        // Tage des Monats

        for (
            let dayNumber = 1;
            dayNumber <= daysInMonth;
            dayNumber += 1
        ) {

            const date =
                new Date(
                    calendarCurrentDate.getFullYear(),
                    calendarCurrentDate.getMonth(),
                    dayNumber
                );


            const key =
                getCalendarDateKey(
                    date
                );


            const dayEvents =
                eventsByDay.get(key) || [];

            const isToday =
              key === todayKey;


            const isFuture =
              key > todayKey;


            const isLearned =
                 dayEvents.length > 0;

            const isBeforeAccountCreation = key < accountCreatedKey; // Vor dem Konto keine rote Nicht-gelernt-Markierung.


            const button =
                document.createElement(
                "button"
        );


                button.type =
                "button";


                button.className =
                "calendar-day";


                // Farblogik: Grün = gelernt Rot = vergangener Tag ohne Lernen Weiß = heute noch offen / zukünftig

if (
    isBeforeAccountCreation
) {

    button.classList.add(
        "calendar-future"
    );

} else if (
    isFuture ||
    (
        isToday &&
        !isLearned
    )
) {

    button.classList.add(
        "calendar-future"
    );

} else if (isLearned) {

    button.classList.add(
        "calendar-learned"
    );

} else {

    button.classList.add(
        "calendar-not-learned"
    );

}


            if (
                key === todayKey
            ) {

                button.classList.add(
                    "calendar-today"
                );

            }


            button.innerHTML = `
                <span class="calendar-day-number">
                    ${dayNumber}
                </span>
            `;


            button.addEventListener(
                "click",
                () => {

                    showCalendarDayDetails(
                        date,
                        dayEvents,
                        isFuture,
                        details
                    );

                }
            );


            grid.appendChild(
                button
            );

        }


        // Leere Felder nach dem Monatsende

        const totalCells =
            firstWeekday +
            daysInMonth;


        const trailingCells =
            (
                7 -
                (
                    totalCells % 7
                )
            ) % 7;


        for (
            let i = 0;
            i < trailingCells;
            i += 1
        ) {

            const emptyDay =
                document.createElement(
                    "div"
                );

            emptyDay.className =
                "calendar-day calendar-empty";

            grid.appendChild(
                emptyDay
            );

        }


        details.innerHTML = "<p>Wähle einen Tag aus, um die Lernaktivität zu sehen.</p>"; // Das Tagesfenster bleibt geschlossen, bis ein Tag angeklickt wird.


    } catch (error) {

        console.error(
            "KALENDER FEHLER:",
            error
        );


        grid.innerHTML = `
            <div class="calendar-loading">
                Kalender konnte nicht geladen werden.
            </div>
        `;


        details.textContent =
            error.message;

    }

}


function showCalendarDayDetails(date, events) { // Öffnet das Tagesfenster für Lernfragen und Prüfungen.
    if (!date) { openCalendarModal("Tagesdetails", "<p>Wähle einen Tag aus, um die Lernaktivität zu sehen.</p>"); return; } // Behandelt fehlende Tage sicher.
    const title = formatCalendarDate(date);
    if (!events || !events.length) { openCalendarModal(title, "<strong>" + escapeHtml(title) + "</strong><p>An diesem Tag wurde noch nicht gelernt.</p>"); return; } // Zeigt leere Lerntage.
    const questionEvents = events.filter((event) => event.event_type === "question_answered"); // Trennt normale Lernfragen.
    const examEvents = events.filter((event) => event.event_type === "exam_completed"); // Trennt abgeschlossene Prüfungen.
    const correct = questionEvents.filter((event) => Number(event.score) === 1).length; // Zählt richtige Lernantworten.
    const accuracy = questionEvents.length ? Math.round((correct / questionEvents.length) * 100) : 0; // Berechnet die Trefferquote.
    const duration = questionEvents.reduce((sum, event) => sum + Number(event.duration || 0), 0); // Berechnet die Lernzeit.
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeText = minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
    const topics = [...new Set(questionEvents.map((event) => event.topic).filter(Boolean))];
    const examsHtml = examEvents.length ? `<div class="calendar-exam-list"><strong>Prüfungen</strong>${examEvents.map((event) => `<span>✓ ${escapeHtml(event.topic || "Prüfung abgeschlossen")}</span>`).join("")}</div>` : "";
    openCalendarModal(title, `<strong>${escapeHtml(title)}</strong><div class="calendar-detail-grid"><span>Fragen</span><strong>${questionEvents.length}</strong><span>Richtig</span><strong>${correct}</strong><span>Trefferquote</span><strong>${accuracy} %</strong><span>Lernzeit</span><strong>${escapeHtml(timeText)}</strong><span>Themen</span><strong>${escapeHtml(topics.join(", ") || "–")}</strong></div>${examsHtml}`); // Zeigt Lernfragen und Prüfungen getrennt.
}
// ========================= ADMIN NAVIGATION =========================

document.querySelectorAll("[data-admin-target]").forEach((button) => { // Verbindet die sechs Admin-Karten mit ihren Verwaltungsbereichen.
    button.addEventListener("click", () => openAdminSection(button.dataset.adminTarget)); // Öffnet nur den ausgewählten Bereich.
});

function openAdminSection(sectionId) { // Öffnet ausschließlich den gewählten Admin-Bereich ohne Seiten-Scroll.
    document.querySelectorAll(".admin-panel").forEach((panel) => panel.removeAttribute("open")); // Schließt die anderen Verwaltungsbereiche.
    document.querySelectorAll(".admin-module-card").forEach((card) => { card.classList.remove("active"); card.removeAttribute("aria-current"); }); // Setzt die alte Auswahl zurück.
    const section = $(sectionId); // Sucht den gewünschten Verwaltungsbereich.
    const trigger = document.querySelector(`[data-admin-target="${sectionId}"]`); // Sucht den passenden Eintrag links.
    if (!section) return; // Bricht ab, wenn der Bereich nicht existiert.
    section.setAttribute("open", "open"); // Zeigt nur den ausgewählten Verwaltungsbereich an.
    trigger?.classList.add("active"); // Hebt den gewählten Eintrag hervor.
    trigger?.setAttribute("aria-current", "page"); // Kennzeichnet den aktiven Admin-Bereich barrierearm.
}

// ========================= ADMIN PRÜFEN =========================

async function openAdminPage() {


if (!currentUser) {

    showLogin();

    return;

}


if (!currentUserIsAdmin) {

    showPage(
        "dashboardPage"
    );

    return;

}


showPage(
    "adminPage"
);


}


// ========================================================= ADMIN BENUTZER =========================================================

let adminUsers = [];
let adminExamItems = [];
let adminExamManagedQuestions = [];
let adminExamOriginalQuestions = [];
let adminExamActive = null;


async function loadAdminUsers() {

    const list =
        $("adminUserList");

    const message =
        $("adminUserMessage");

    if (!list) {
        return;
    }

    list.innerHTML = `
        <p>
            Benutzer werden geladen ...
        </p>
    `;

    try {

        const {
            data,
            error
        } = await db
            .from("profiles")
            .select(
                "id, username, is_admin, created_at"
            )
            .order(
                "created_at",
                { ascending: false }
            );

        if (error) {
            throw error;
        }

        adminUsers =
            data || [];

        renderAdminUsers();

        setMessage(
            message,
            ""
        );

    } catch (error) {

        console.error(
            "ADMIN BENUTZER:",
            error
        );

        list.innerHTML = "";

        setMessage(
            message,
            "Benutzer konnten nicht geladen werden: " +
                error.message
        );

    }
}


function renderAdminUsers() {

    const list =
        $("adminUserList");

    const search =
        $("adminUserSearch");

    if (!list) {
        return;
    }

    const query =
        search
            ? search.value
                .trim()
                .toLowerCase()
            : "";

    const filtered =
        adminUsers.filter(
            (user) => {

                const searchable = [
                    user.username,
                    user.id
                ]
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(
                    query
                );
            }
        );

    if (!filtered.length) {

        list.innerHTML = `
            <p>
                Keine Benutzer gefunden.
            </p>
        `;

        return;
    }

    list.innerHTML =
        filtered
            .map(
                (user) => {

                    const isCurrentUser =
                        currentUser &&
                        currentUser.id ===
                            user.id;

                    const role =
                        user.is_admin
                            ? "Administrator"
                            : "Benutzer";

                    const createdAt =
                        user.created_at
                            ? new Date(
                                user.created_at
                            ).toLocaleDateString(
                                "de-DE"
                            )
                            : "–";

                    return `
                        <div
                            class="admin-user-item"
                        >

                            <div
                                class="admin-user-info"
                            >

                                <strong
                                    class="admin-user-name"
                                >
                                    ${escapeHtml(
                                        user.username
                                    )}
                                </strong>

                                <div
                                    class="admin-user-meta"
                                >

                                    <span
                                        class="admin-user-role ${
                                            user.is_admin
                                                ? "admin"
                                                : ""
                                        }"
                                    >
                                        ${role}
                                    </span>

                                    <span>
                                        Seit ${createdAt}
                                    </span>

                                    ${
                                        isCurrentUser
                                            ? `<span>Du</span>`
                                            : ""
                                    }

                                </div>

                            </div>

                            <div
                                class="admin-actions"
                            >

                                <button
                                    type="button"
                                    onclick="editAdminUser('${
                                        String(user.id)
                                            .replace(/\\/g, "\\\\")
                                            .replace(/'/g, "\\'")
                                    }')"
                                >
                                    Bearbeiten
                                </button>

                                <button
                                    type="button"
                                    class="danger-button"
                                    onclick="deleteAdminUser('${String(user.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')"
                                >
                                    Konto löschen
                                </button>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


const adminUserSearch =
    $("adminUserSearch");

if (adminUserSearch) {
    adminUserSearch.addEventListener(
        "input",
        renderAdminUsers
    );
}


window.editAdminUser =
function (id) {

    const user =
        adminUsers.find(
            (item) =>
                item.id === id
        );

    if (!user) {
        return;
    }

    $("adminUserEditId").value =
        user.id;

    $("adminUserEditUsername").value =
        user.username || "";

    const roleSelect =
        $("adminUserEditRole");

    const roleHint =
        $("adminUserRoleHint");

    roleSelect.value =
        user.is_admin
            ? "admin"
            : "user";

    const isCurrentUser =
        currentUser &&
        currentUser.id === user.id;

    roleSelect.disabled =
        isCurrentUser;

    roleHint.textContent =
        isCurrentUser
            ? "Dein eigenes Admin-Konto kann hier nicht auf Benutzer zurückgestuft werden."
            : "";

    $("adminUserEditPanel")
        .classList.remove(
            "hidden"
        );

    $("adminUserEditPanel")
        .scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
};


$("adminUserEditForm")
.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const id =
            $("adminUserEditId").value;

        const username =
            $("adminUserEditUsername")
                .value
                .trim();

        const user =
            adminUsers.find(
                (item) =>
                    item.id === id
            );

        if (!user) {
            return;
        }

        if (username.length < 3) {

            setMessage(
                $("adminUserMessage"),
                "Der Benutzername muss mindestens 3 Zeichen lang sein."
            );

            return;
        }

        const isCurrentUser =
            currentUser &&
            currentUser.id === id;

        const isAdmin =
            isCurrentUser
                ? user.is_admin
                : $("adminUserEditRole").value ===
                    "admin";

        try {

            const {
                error
            } = await db
                .from("profiles")
                .update({
                    username,
                    is_admin: isAdmin
                })
                .eq(
                    "id",
                    id
                );

            if (error) {
                throw error;
            }

            $("adminUserEditPanel")
                .classList.add(
                    "hidden"
                );

            setMessage(
                $("adminUserMessage"),
                "Benutzer wurde gespeichert.",
                "success"
            );

            await loadAdminUsers();

            if (
                isCurrentUser
            ) {
                currentUserIsAdmin =
                    isAdmin;
            }

        } catch (error) {

            console.error(
                "ADMIN BENUTZER SPEICHERN:",
                error
            );

            setMessage(
                $("adminUserMessage"),
                "Benutzer konnte nicht gespeichert werden: " +
                    error.message
            );

        }

    }
);


$("cancelAdminUserEdit")
.addEventListener(
    "click",
    () => {

        $("adminUserEditPanel")
            .classList.add(
                "hidden"
            );

    }
);

// ========================================================= ADMIN KONTO LÖSCHEN =========================================================

window.deleteAdminUser = async function (id) { // Löscht ein Benutzerkonto über die geschützte Datenbankfunktion.
    const user = adminUsers.find((item) => item.id === id); // Sucht den ausgewählten Benutzer.
    if (!user) return; // Bricht bei einem nicht mehr vorhandenen Benutzer ab.
    if (!confirm(`Konto von ${user.username || "diesem Benutzer"} wirklich dauerhaft löschen?`)) return; // Verlangt eine Bestätigung.
    try {
        const { error } = await db.functions.invoke("delete-account", { body: { userId: id } }); // Führt die geschützte Kontolöschung serverseitig aus.
        if (error) throw error; // Übernimmt Fehler der Datenbankfunktion.
        if (currentUser && currentUser.id === id) { // Beendet bei Selbstlöschung die aktuelle Sitzung.
            currentUser = null; // Entfernt den Benutzerstatus.
            currentUserIsAdmin = false; // Entfernt den Adminstatus.
            currentUserCreatedAt = null; // Entfernt den persönlichen Kalenderstart.
            examState = null; // Verwirft eine offene Prüfung.
            stopExamTimer(); // Stoppt einen laufenden Prüfungstimer.
            showLogin(); // Kehrt zur Anmeldung zurück.
            return; // Beendet die Funktion.
        }
        setMessage($("adminUserMessage"), "Konto wurde gelöscht.", "success"); // Zeigt die erfolgreiche Löschung.
        await loadAdminUsers(); // Aktualisiert die Benutzerliste.
    } catch (error) {
        console.error("ADMIN KONTO LÖSCHEN:", error); // Schreibt technische Details in die Konsole.
        setMessage($("adminUserMessage"), "Konto konnte nicht gelöscht werden: " + error.message); // Zeigt den Fehler im Adminbereich.
    }
};

// ========================= AKTUELLE SESSION =========================

async function checkCurrentUser() {


try {

    const {
        data,
        error
    } = await db.auth.getUser();


    if (error) {
        throw error;
    }


    if (data.user) {

        await openPortal(
            data.user
        );

    } else {

        showLogin();

    }


} catch (error) {

    console.error(
        "SESSION-FEHLER:",
        error
    );


    showLogin();

}


}

// ========================= FORMELSAMMLUNG =========================

async function loadFormulas() {


const message =
    $("formulaMessage");


try {

    const {
        data,
        error
    } = await db
        .from("formulas")
        .select("*")
        .order("category")
        .order("title");


    if (error) {
        throw error;
    }


    formulas =
        data || [];


    fillCategories();

    renderFormulas();


    setMessage(
        message,
        ""
    );


} catch (error) {

    console.error(
        "FORMELN FEHLER:",
        error
    );


    setMessage(
        message,
        "Formeln konnten nicht geladen werden: " +
            error.message
    );


    $("formulaGrid")
        .innerHTML = "";

}


}

function fillCategories() {


const select =
    $("formulaCategory");


const current =
    select.value;


const categories = [
    ...new Set(
        formulas
            .map(
                (formula) =>
                    formula.category
            )
            .filter(Boolean)
    )
].sort(
    (a, b) =>
        a.localeCompare(
            b,
            "de"
        )
);


select.innerHTML =
    '<option value="">Alle Kategorien</option>' +
    categories
        .map(
            (category) =>
          `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
        ).join("");

        
select.value =
    categories.includes(
        current
    )
        ? current
        : "";


}

function renderFormulas() { // Zeichnet Formeln und bewertet Suchtreffer nach Relevanz.
    const grid = $("formulaGrid");
    const query = $("formulaSearch").value.trim().toLowerCase();
    const category = $("formulaCategory").value;
    const filtered = formulas
        .filter((formula) => {
            const searchableText = [formula.title, formula.formula, formula.description, formula.variables, formula.units, formula.example].join(" ").toLowerCase();
            return (!query || searchableText.includes(query)) && (!category || formula.category === category);
        })
        .map((formula) => ({ formula, score: getFormulaSearchScore(formula, query) }))
        .sort((a, b) => b.score - a.score || String(a.formula.title).localeCompare(String(b.formula.title), "de"))
        .map((item) => item.formula);
    if (!filtered.length) {
        grid.innerHTML = `<div class="placeholder-card"><div class="placeholder-icon">∑</div><h2>Keine Formeln gefunden</h2><p>Ändere deine Suche oder Kategorie.</p></div>`;
        return;
    }
    grid.innerHTML = filtered.map((formula) => `
        <article class="formula-card">
            <p class="eyebrow">${escapeHtml(formula.category)}</p>
            <h2>${escapeHtml(formula.title)}</h2>
            <div class="formula-expression">${escapeHtml(formula.formula)}</div>
            ${formula.description ? `<p>${escapeHtml(formula.description)}</p>` : ""}
            <div class="formula-meta">
                ${formula.variables ? `<div><strong>Variablen:</strong> ${escapeHtml(formula.variables)}</div>` : ""}
                ${formula.units ? `<div><strong>Einheiten:</strong> ${escapeHtml(formula.units)}</div>` : ""}
                ${formula.example ? `<div><strong>Beispiel:</strong> ${escapeHtml(formula.example)}</div>` : ""}
            </div>
        </article>
    `).join("");
}

function getFormulaSearchScore(formula, query) { // Gewichtet Titel-Treffer stärker als Nebentexte.
    if (!query) return 0;
    const title = String(formula.title || "").toLowerCase();
    const category = String(formula.category || "").toLowerCase();
    const formulaText = String(formula.formula || "").toLowerCase();
    const description = String(formula.description || "").toLowerCase();
    let score = 0;
    if (title === query) score += 1000;
    else if (title.startsWith(query)) score += 700;
    else if (title.split(/\s+/).some((word) => word.startsWith(query))) score += 600;
    else if (title.includes(query)) score += 450;
    if (category.includes(query)) score += 180;
    if (formulaText.includes(query)) score += 120;
    if (description.includes(query)) score += 80;
    return score;
}

const formulaSearch = $("formulaSearch");

if (formulaSearch) {
    formulaSearch.addEventListener(
        "input",
        renderFormulas
    );
}

const formulaCategory = $("formulaCategory");

if (formulaCategory) {
    formulaCategory.addEventListener(
        "change",
        renderFormulas
    );
}

const reloadFormulasButton = $("reloadFormulasButton");

if (reloadFormulasButton) {
    reloadFormulasButton.addEventListener(
        "click",
        loadFormulas
    );
}

// ========================= ADMIN FORMELN =========================

$("formulaForm")
.addEventListener(
"submit",
async (event) => {

        event.preventDefault();


        const id =
            $("formulaId")
                .value;


        const payload = {

            category:
                $("formulaCategoryAdmin")
                    .value
                    .trim(),

            title:
                $("formulaTitle")
                    .value
                    .trim(),

            formula:
                $("formulaExpression")
                    .value
                    .trim(),

            description:
                $("formulaDescription")
                    .value
                    .trim() ||
                null,

            variables:
                $("formulaVariables")
                    .value
                    .trim() ||
                null,

            units:
                $("formulaUnits")
                    .value
                    .trim() ||
                null,

            example:
                $("formulaExample")
                    .value
                    .trim() ||
                null

        };


        try {

            const result =
                id

                    ? await db
                        .from("formulas")
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            id
                        )

                    : await db
                        .from("formulas")
                        .insert(
                            payload
                        );


            if (result.error) {
                throw result.error;
            }


            resetFormulaForm();

            await loadFormulas();

            await loadAdminFormulas();


        } catch (error) {

            console.error(
                "FORMEL SPEICHERN:",
                error
            );


            alert(
                "Formel konnte nicht gespeichert werden: " +
                    error.message
            );

        }

    }
);


$("cancelFormulaEdit")
.addEventListener(
"click",
resetFormulaForm
);

function resetFormulaForm() {


$("formulaForm")
    .reset();

$("formulaId")
    .value = "";


}

async function loadAdminFormulas() {


const list =
    $("adminFormulaList");


if (!list) {
    return;
}


const {
    data,
    error
} = await db
    .from("formulas")
    .select(
        "id, title, category, formula"
    )
    .order("category")
    .order("title");


if (error) {

    list.innerHTML =
        `<p class="message">Fehler: ${escapeHtml(error.message)}</p>`;

    return;

}


list.innerHTML =
    (data || [])
        .map(
            (formula) => `

                <div class="admin-formula-item">

                    <div>

                        <strong>
                            ${escapeHtml(formula.title)}
                        </strong>

                        <small>
                            ${escapeHtml(formula.category)}
                            ·
                            ${escapeHtml(formula.formula)}
                        </small>

                    </div>

                    <div class="admin-actions">

                        <button
                            type="button"
                            onclick="editFormula(${Number(formula.id)})"
                        >
                            Bearbeiten
                        </button>

                        <button
                            type="button"
                            class="danger-button"
                            onclick="deleteFormula(${Number(formula.id)})"
                        >
                            Löschen
                        </button>

                    </div>

                </div>
                `

        )
        .join("") ||
    "<p>Noch keine Formeln vorhanden.</p>";


}

window.editFormula =
async (id) => {


    const formula =
        formulas.find(
            (item) =>
                Number(item.id) ===
                Number(id)
        );


    if (!formula) {
        return;
    }


    $("formulaId").value =
        formula.id;

    $("formulaTitle").value =
        formula.title || "";

    $("formulaCategoryAdmin").value =
        formula.category || "";

    $("formulaExpression").value =
        formula.formula || "";

    $("formulaDescription").value =
        formula.description || "";

    $("formulaVariables").value =
        formula.variables || "";

    $("formulaUnits").value =
        formula.units || "";

    $("formulaExample").value =
        formula.example || "";


    $("adminPage")
        .scrollIntoView({
            behavior: "smooth"
        });

};


window.deleteFormula =
async (id) => {


    if (
        !confirm(
            "Diese Formel wirklich löschen?"
        )
    ) {

        return;

    }


    const {
        error
    } = await db
        .from("formulas")
        .delete()
        .eq(
            "id",
            id
        );


    if (error) {

        alert(
            "Löschen fehlgeschlagen: " +
                error.message
        );

        return;

    }


    await loadFormulas();

    await loadAdminFormulas();

};
// ========================= ADMIN PRÜFUNGEN =========================


// ========================================================= PRÜFUNGEN LADEN =========================================================

async function loadAdminExams() { // Lädt nur bestehende Prüfungen für die Verwaltung.
    const list = $("adminExamList");
    const select = $("adminExamQuestionSelect");
    if (!list || !select) return;
    list.innerHTML = "<p>Prüfungen werden geladen ...</p>";
    try {
        const [{ data: exams, error: examError }, { data: assignments, error: assignmentError }] = await Promise.all([
            db.from("exam_sets").select("id,title,exam_part,description,duration_minutes,is_active,created_at").order("exam_part").order("created_at"),
            db.from("exam_set_questions").select("exam_id,question_id,position").order("position")
        ]);
        if (examError) throw examError;
        if (assignmentError) throw assignmentError;
        adminExamItems = exams || [];
        populateAdminQuestionExamSelect();
        const counts = new Map();
        (assignments || []).forEach((row) => counts.set(Number(row.exam_id), (counts.get(Number(row.exam_id)) || 0) + 1));
        select.innerHTML = `<option value="">Prüfung auswählen ...</option>${adminExamItems.map((exam) => `<option value="${Number(exam.id)}">${escapeHtml(exam.title)}</option>`).join("")}`;
        list.innerHTML = adminExamItems.length ? adminExamItems.map((exam) => `
            <article class="admin-formula-item admin-exam-item">
                <div>
                    <strong>${escapeHtml(exam.title)}</strong>
                    <small>${escapeHtml(exam.exam_part || "Ohne Prüfungsteil")} · ${counts.get(Number(exam.id)) || 0} Fragen · ${exam.duration_minutes ? `${Number(exam.duration_minutes)} min` : "ohne Zeitlimit"} · ${exam.is_active ? "aktiv" : "inaktiv"}</small>
                    ${exam.description ? `<p class="admin-inline-note">${escapeHtml(exam.description)}</p>` : ""}
                </div>
                <div class="admin-actions">
                    <button type="button" class="secondary-button" data-admin-exam-manage="${Number(exam.id)}">Fragen verwalten</button>
                </div>
            </article>
        `).join("") : `<div class="placeholder-card"><h2>Noch keine Prüfungen</h2><p>Lege Prüfungen außerhalb dieses Verwaltungsbereichs an und verwalte hier anschließend ihre Fragen.</p></div>`;
        list.querySelectorAll("[data-admin-exam-manage]").forEach((button) => button.addEventListener("click", () => {
            const examId = Number(button.dataset.adminExamManage);
            select.value = String(examId);
            loadAdminExamQuestions();
        }));
        if (adminExamActive && adminExamItems.some((exam) => Number(exam.id) === Number(adminExamActive.id))) {
            select.value = String(adminExamActive.id);
        }
    } catch (error) {
        console.error("ADMIN PRÜFUNGEN:", error);
        list.innerHTML = `<p class="message">Prüfungen konnten nicht geladen werden: ${escapeHtml(error.message)}</p>`;
    }
}

$("adminExamQuestionSelect")?.addEventListener("change", loadAdminExamQuestions); // Lädt die ausgewählte Prüfung.
$("adminExamQuestionSearch")?.addEventListener("input", renderAdminExamAvailableQuestions); // Filtert die noch freien Fragen.
$("saveExamQuestionsButton")?.addEventListener("click", saveExamQuestions); // Speichert die aktuelle Reihenfolge.
$("cancelExamQuestionChangesButton")?.addEventListener("click", restoreAdminExamQuestions); // Verwirft ungespeicherte Änderungen.

async function loadAdminExamQuestions() { // Lädt die aktuelle Fragenreihenfolge einer Prüfung.
    const select = $("adminExamQuestionSelect");
    const manager = $("adminExamManager");
    const currentList = $("adminExamCurrentList");
    if (!select || !manager || !currentList) return;
    const examId = Number(select.value);
    if (!examId) {
        adminExamActive = null;
        adminExamManagedQuestions = [];
        adminExamOriginalQuestions = [];
        manager.classList.add("hidden");
        return;
    }
    currentList.innerHTML = "<p>Fragen werden geladen ...</p>";
    try {
        const exam = adminExamItems.find((item) => Number(item.id) === examId);
        if (!exam) throw new Error("Die ausgewählte Prüfung wurde nicht gefunden.");
        await refreshAdminExamQuestionBank(); // Lädt die aktuelle Fragenbank für das Hinzufügen.
        const [{ data: questions, error: questionError }, { data: assignedRows, error: assignedError }] = await Promise.all([
            db.from("questions").select("id,category,topic,question,exam_part,question_type,difficulty").order("id"),
            db.from("exam_set_questions").select("question_id,position").eq("exam_id", examId).order("position")
        ]);
        if (questionError) throw questionError;
        if (assignedError) throw assignedError;
        const questionMap = new Map((questions || []).map((question) => [Number(question.id), question]));
        adminExamActive = exam;
        adminExamManagedQuestions = (assignedRows || []).map((row) => questionMap.get(Number(row.question_id))).filter(Boolean).map((question) => ({ ...question }));
        adminExamOriginalQuestions = adminExamManagedQuestions.map((question) => ({ ...question }));
        $("adminExamManagerTitle").textContent = exam.title || "Prüfung";
        $("adminExamManagerMeta").textContent = `${exam.exam_part || "Ohne Prüfungsteil"} · ${exam.duration_minutes ? `${Number(exam.duration_minutes)} Minuten` : "ohne Zeitlimit"}`;
        $("adminExamQuestionSearch").value = "";
        manager.classList.remove("hidden");
        renderAdminExamManager();
        setMessage($("adminExamQuestionMessage"), "");
        manager.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        console.error("ADMIN PRÜFUNGSFRAGEN:", error);
        setMessage($("adminExamQuestionMessage"), "Fragen konnten nicht geladen werden: " + error.message);
    }
}

function renderAdminExamManager() { // Zeichnet aktuelle und verfügbare Prüfungsfragen.
    renderAdminExamCurrentQuestions();
    renderAdminExamAvailableQuestions();
    $("adminExamQuestionCount").textContent = String(adminExamManagedQuestions.length);
}

function renderAdminExamCurrentQuestions() { // Zeichnet die Fragen, die bereits in der Prüfung liegen.
    const list = $("adminExamCurrentList");
    if (!list) return;
    list.innerHTML = adminExamManagedQuestions.length ? adminExamManagedQuestions.map((question, index) => `
        <article class="admin-exam-managed-item">
            <span class="admin-exam-number">${index + 1}</span>
            <div class="admin-exam-question-copy">
                <strong>#${Number(question.id)} · ${escapeHtml(question.category || "Ohne Thema")}</strong>
                <small>${escapeHtml(question.topic || "Ohne Unterthema")} · ${question.question_type === "free_text" ? "Freitext" : "A–D"} · ${escapeHtml(question.difficulty || "mittel")}</small>
                <p>${escapeHtml(question.question || "")}</p>
            </div>
            <div class="admin-exam-order-actions">
                <button type="button" class="secondary-button" data-exam-up="${Number(question.id)}" ${index === 0 ? "disabled" : ""} aria-label="Frage nach oben">↑</button>
                <button type="button" class="secondary-button" data-exam-down="${Number(question.id)}" ${index === adminExamManagedQuestions.length - 1 ? "disabled" : ""} aria-label="Frage nach unten">↓</button>
                <button type="button" class="danger-button" data-exam-remove="${Number(question.id)}">Entfernen</button>
            </div>
        </article>
    `).join("") : `<div class="placeholder-card"><h2>Noch keine Fragen</h2><p>Füge rechts die ersten Fragen hinzu.</p></div>`;
    list.querySelectorAll("[data-exam-up]").forEach((button) => button.addEventListener("click", () => moveAdminExamQuestion(Number(button.dataset.examUp), -1)));
    list.querySelectorAll("[data-exam-down]").forEach((button) => button.addEventListener("click", () => moveAdminExamQuestion(Number(button.dataset.examDown), 1)));
    list.querySelectorAll("[data-exam-remove]").forEach((button) => button.addEventListener("click", () => removeAdminExamQuestion(Number(button.dataset.examRemove))));
}

function renderAdminExamAvailableQuestions() { // Zeichnet Fragen, die noch hinzugefügt werden können.
    const list = $("adminExamAvailableList");
    if (!list) return;
    const search = ($("adminExamQuestionSearch")?.value || "").trim().toLowerCase();
    const assignedIds = new Set(adminExamManagedQuestions.map((question) => Number(question.id)));
    const available = adminQuestionsForExamManager.filter((question) => !assignedIds.has(Number(question.id)) && [question.category, question.topic, question.question, question.exam_part].join(" ").toLowerCase().includes(search));
    list.innerHTML = available.length ? available.map((question) => `
        <article class="admin-exam-available-item">
            <div class="admin-exam-question-copy">
                <strong>#${Number(question.id)} · ${escapeHtml(question.category || "Ohne Thema")}</strong>
                <small>${escapeHtml(question.topic || "Ohne Unterthema")} · ${question.exam_part ? escapeHtml(question.exam_part) : "kein fester Prüfungsteil"}</small>
                <p>${escapeHtml(question.question || "")}</p>
            </div>
            <button type="button" class="secondary-button" data-exam-add="${Number(question.id)}">Hinzufügen</button>
        </article>
    `).join("") : `<div class="placeholder-card"><h2>Keine passenden Fragen</h2><p>Die Suche anpassen oder neue Fragen im Bereich „Fragen“ anlegen.</p></div>`;
    list.querySelectorAll("[data-exam-add]").forEach((button) => button.addEventListener("click", () => addAdminExamQuestion(Number(button.dataset.examAdd))));
}

const ADMIN_FIXED_MAIN_TOPICS = [
    "Elektrotechnik",
    "Elektrische Schaltungen",
    "Elektronische Bauteile",
    "Digitaltechnik",
    "Messtechnik",
    "Steuerungs- & Regelungstechnik",
    "Programmierung",
    "Mikrocontroller",
    "Kommunikation & Netzwerke",
    "IT & Computersysteme",
    "Fertigung & Baugruppen",
    "Fehlersuche & Instandhaltung",
    "Prüf- & Prüfsysteme",
    "Sicherheit, Normen & Dokumentation",
    "Sonstiges"
]; // Erlaubte Hauptthemen im Frageformular.
let adminQuestionsForExamManager = [];
let adminTopics = []; // Speichert Hauptthemen und Unterthemen für die Fragenverwaltung.
let adminExamQuestionAssignments = new Map(); // Speichert die Prüfungszuordnung je Frage.
let adminSelectedCategoryName = ""; // Merkt das zuletzt gewählte Hauptthema.
let adminSelectedSubtopicName = ""; // Merkt das zuletzt gewählte Unterthema.

function syncAdminQuestionsForExamManager() { // Übernimmt die aktuelle Fragenbank in den Prüfungsmanager.
    adminQuestionsForExamManager = Array.isArray(adminQuestions) ? adminQuestions.map((question) => ({ ...question })) : [];
}

async function refreshAdminExamQuestionBank() { // Lädt eine aktuelle Fragenbank für das Hinzufügen.
    const { data, error } = await db.from("questions").select("id,category,topic,question,exam_part,question_type,difficulty").order("id");
    if (error) throw error;
    adminQuestionsForExamManager = data || [];
}

function addAdminExamQuestion(id) { // Fügt eine Frage am Ende der Prüfung ein.
    const question = adminQuestionsForExamManager.find((item) => Number(item.id) === id);
    if (!question || adminExamManagedQuestions.some((item) => Number(item.id) === id)) return;
    adminExamManagedQuestions.push({ ...question });
    renderAdminExamManager();
    setMessage($("adminExamQuestionMessage"), "Frage hinzugefügt. Noch nicht gespeichert.", "success");
}

function removeAdminExamQuestion(id) { // Entfernt eine Frage erst aus dem lokalen Entwurf.
    adminExamManagedQuestions = adminExamManagedQuestions.filter((question) => Number(question.id) !== id);
    renderAdminExamManager();
    setMessage($("adminExamQuestionMessage"), "Frage entfernt. Noch nicht gespeichert.", "success");
}

function moveAdminExamQuestion(id, direction) { // Verschiebt eine Frage in der lokalen Reihenfolge.
    const index = adminExamManagedQuestions.findIndex((question) => Number(question.id) === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= adminExamManagedQuestions.length) return;
    [adminExamManagedQuestions[index], adminExamManagedQuestions[targetIndex]] = [adminExamManagedQuestions[targetIndex], adminExamManagedQuestions[index]];
    renderAdminExamManager();
}

function restoreAdminExamQuestions() { // Lädt den zuletzt gespeicherten Stand wieder ein.
    adminExamManagedQuestions = adminExamOriginalQuestions.map((question) => ({ ...question }));
    renderAdminExamManager();
    setMessage($("adminExamQuestionMessage"), "Ungespeicherte Änderungen wurden verworfen.");
}

async function saveExamQuestions() { // Speichert Auswahl und Reihenfolge der Prüfungsfragen.
    const select = $("adminExamQuestionSelect");
    const message = $("adminExamQuestionMessage");
    const examId = Number(select?.value);
    if (!examId) { setMessage(message, "Bitte zuerst eine Prüfung auswählen."); return; }
    try {
        const { error: deleteError } = await db.from("exam_set_questions").delete().eq("exam_id", examId);
        if (deleteError) throw deleteError;
        if (adminExamManagedQuestions.length) {
            const rows = adminExamManagedQuestions.map((question, index) => ({ exam_id: examId, question_id: Number(question.id), position: index + 1 }));
            const { error: insertError } = await db.from("exam_set_questions").insert(rows);
            if (insertError) throw insertError;
        }
        adminExamOriginalQuestions = adminExamManagedQuestions.map((question) => ({ ...question }));
        setMessage(message, `${adminExamManagedQuestions.length} Fragen gespeichert.`, "success");
        await loadAdminExams();
        select.value = String(examId);
    } catch (error) {
        console.error("ADMIN PRÜFUNGSFRAGEN SPEICHERN:", error);
        setMessage(message, "Änderungen konnten nicht gespeichert werden: " + error.message);
    }
}

// ADMIN THEMEN – verwaltet Themen und Unterthemen.
async function loadAdminTopics() {
    try {
        const { data, error } = await db.from("learning_topics").select("id,parent_id,name,description,sort_order,is_active").order("sort_order").order("name");
        if (error) throw error;
        adminTopics = data || [];
        renderAdminTopics();
        populateAdminQuestionTopicSelects();
    } catch (error) {
        setMessage($("adminQuestionMessage"), "Themen konnten nicht geladen werden: " + error.message);
    }
}

function getAdminRootTopics() { return adminTopics.filter((topic) => !topic.parent_id); } // Liefert alle Hauptthemen.
function getAdminChildren(parentId) { return adminTopics.filter((topic) => Number(topic.parent_id) === Number(parentId)); } // Liefert Unterthemen eines Hauptthemas.

function renderAdminTopics() { // Zeigt die Themen als Karten für die Fragenverwaltung.
    const list = $("adminTopicList");
    if (!list) return;
    const roots = getAdminRootTopics();
    list.innerHTML = roots.length ? roots.map((topic) => {
        const count = getAdminChildren(topic.id).length;
        const active = topic.is_active ? "Aktiv" : "Inaktiv";
        return `<button type="button" class="admin-topic-card" data-admin-topic-id="${topic.id}"><span class="admin-topic-card-icon">${escapeHtml("▤")}</span><span><strong>${escapeHtml(topic.name)}</strong><small>${count} Unterthemen · ${active}</small></span><span>→</span></button>`;
    }).join("") : `<div class="placeholder-card"><h2>Noch keine Themen</h2><p>Lege im Themenfenster das erste Thema an.</p></div>`;
    list.querySelectorAll("[data-admin-topic-id]").forEach((button) => {
        button.addEventListener("click", () => selectAdminTopic(Number(button.dataset.adminTopicId), null));
    });
}

function selectAdminTopic(categoryId, topicId) { // Filtert die Admin-Fragen nach Thema und Unterthema.
    const category = adminTopics.find((item) => Number(item.id) === Number(categoryId));
    const topic = topicId ? adminTopics.find((item) => Number(item.id) === Number(topicId)) : null;
    if (!$("adminSelectedTopicTitle")) return;
    adminSelectedCategoryName = category?.name || ""; // Merkt das ausgewählte Hauptthema.
    adminSelectedSubtopicName = topic?.name || ""; // Merkt das ausgewählte Unterthema.
    $("adminSelectedTopicTitle").textContent = topic ? `${category?.name || ""} · ${topic.name}` : category?.name || "Alle Fragen";
    const filtered = adminQuestions.filter((question) => {
        const cat = question.category || "";
        const sub = question.topic || "";
        return cat === (category?.name || "") && (!topic || sub === topic.name);
    });
    $("adminSelectedTopicCount").textContent = String(filtered.length);
    renderAdminQuestionList(filtered);
}

async function loadAdminQuestions() { // Lädt alle Fragen und ihre Prüfungszuordnungen.
    const list = $("adminQuestionList");
    if (!list) return;
    list.innerHTML = "<p>Fragen werden geladen ...</p>";
    try {
        const [{ data, error }, { data: assignments, error: assignmentError }] = await Promise.all([
            db.from("questions").select("id,category,topic,question,answer_a,answer_b,answer_c,answer_d,correct_answer,explanation,difficulty,exam_part,question_type,free_text_answer,image_path").order("id"),
            db.from("exam_set_questions").select("exam_id,question_id").order("position")
        ]);
        if (error) throw error;
        if (assignmentError) throw assignmentError;
        const assignmentMap = new Map();
        (assignments || []).forEach((row) => {
            const questionId = Number(row.question_id);
            if (!assignmentMap.has(questionId)) assignmentMap.set(questionId, []);
            assignmentMap.get(questionId).push(Number(row.exam_id));
        });
        adminQuestionExamAssignments = assignmentMap;
        adminQuestions = (data || []).map((question) => ({ ...question, exam_ids: assignmentMap.get(Number(question.id)) || [] }));
        syncAdminQuestionsForExamManager();
        renderAdminQuestionList(adminQuestions);
        renderAdminTopics();
        populateAdminQuestionTopicSelects();
        populateAdminQuestionExamSelect();
    } catch (error) {
        setMessage($("adminQuestionMessage"), "Fragen konnten nicht geladen werden: " + error.message);
    }
}

function renderAdminQuestionList(items) { // Zeichnet die Trefferliste der Fragenverwaltung.
    const list = $("adminQuestionList");
    if (!list) return;
    const query = ($("adminQuestionSearch")?.value || "").trim().toLowerCase();
    const filtered = (items || []).filter((question) => [question.category, question.topic, question.question].join(" ").toLowerCase().includes(query));
    list.innerHTML = filtered.length ? filtered.map((question) => {
        const examIds = Array.isArray(question.exam_ids) ? question.exam_ids : [];
        const examNames = examIds.map((id) => adminExamItems.find((exam) => Number(exam.id) === Number(id))?.title).filter(Boolean);
        const examStatus = examNames.length ? `Prüfung: ${escapeHtml(examNames.join(", "))}` : "Nur Fragenmodus";
        return `<article class="admin-question-row"><div><strong>#${question.id} · ${escapeHtml(question.category || "Ohne Thema")}</strong><small>${escapeHtml(question.topic || "Ohne Unterthema")} · ${question.question_type === "free_text" ? "Freitext" : "A–D"} · ${escapeHtml(question.difficulty || "mittel")} · ${examStatus}</small><p>${escapeHtml(question.question)}</p></div><div class="admin-actions"><button type="button" data-admin-question-edit="${question.id}">Bearbeiten</button><button type="button" class="danger-button" data-admin-question-delete="${question.id}">Löschen</button></div></article>`;
    }).join("") : `<div class="placeholder-card"><h2>Keine Fragen gefunden</h2><p>Ändere die Suche oder wähle ein anderes Thema.</p></div>`;
    list.querySelectorAll("[data-admin-question-edit]").forEach((button) => button.addEventListener("click", () => editAdminQuestion(Number(button.dataset.adminQuestionEdit))));
    list.querySelectorAll("[data-admin-question-delete]").forEach((button) => button.addEventListener("click", () => deleteAdminQuestion(Number(button.dataset.adminQuestionDelete))));
}

function populateAdminQuestionExamSelect(preferredIds = []) { // Füllt die optionale Prüfungszuordnung.
    const examSelect = $("adminQuestionExam");
    if (!examSelect) return;
    const currentValue = examSelect.value;
    const preferred = Array.isArray(preferredIds) && preferredIds.length ? preferredIds.map(Number) : (currentValue ? [Number(currentValue)] : []);
    examSelect.innerHTML = `<option value="">Keine Prüfung – nur Fragenmodus</option>${adminExamItems.filter((exam) => exam.is_active !== false).map((exam) => `<option value="${Number(exam.id)}">${escapeHtml(exam.title)}${exam.exam_part ? ` · ${escapeHtml(exam.exam_part)}` : ""}</option>`).join("")}`;
    if (preferred.length === 1 && adminExamItems.some((exam) => Number(exam.id) === preferred[0])) examSelect.value = String(preferred[0]);
    else if (preferred.length > 1) {
        const option = document.createElement("option");
        option.value = "__MULTIPLE__";
        option.textContent = "Mehrere Prüfungen · Zuordnung unverändert";
        examSelect.appendChild(option);
        examSelect.value = "__MULTIPLE__";
    } else examSelect.value = "";
}

function populateAdminQuestionTopicSelects() { // Füllt nur die festgelegten Hauptthemen und passende Unterthemen.
    const categorySelect = $("adminQuestionCategory");
    const topicSelect = $("adminQuestionTopic");
    if (!categorySelect || !topicSelect) return;
    const currentCategory = categorySelect.value;
    categorySelect.innerHTML = `<option value="">Hauptthema auswählen ...</option>${ADMIN_FIXED_MAIN_TOPICS.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
    if (ADMIN_FIXED_MAIN_TOPICS.includes(currentCategory)) categorySelect.value = currentCategory;
    const preferredTopic = topicSelect.value;
    if (categorySelect.value) populateAdminSubtopics(preferredTopic);
    else topicSelect.innerHTML = `<option value="">Erst Hauptthema auswählen ...</option>`;
    populateAdminQuestionExamSelect();
}

function populateAdminSubtopics(preferredName = "") { // Zeigt nur Unterthemen des gewählten Hauptthemas.
    const categorySelect = $("adminQuestionCategory");
    const topicSelect = $("adminQuestionTopic");
    if (!categorySelect || !topicSelect) return;
    const root = getAdminRootTopics().find((topic) => topic.name === categorySelect.value);
    const children = root ? getAdminChildren(root.id).filter((topic) => topic.is_active !== false) : [];
    topicSelect.innerHTML = children.length ? `<option value="">Unterthema auswählen ...</option>${children.map((topic) => `<option value="${escapeHtml(topic.name)}">${escapeHtml(topic.name)}</option>`).join("")}` : `<option value="">Kein Unterthema vorhanden</option>`;
    if (children.some((item) => item.name === preferredName)) topicSelect.value = preferredName;
    adminSelectedCategoryName = categorySelect.value || "";
    adminSelectedSubtopicName = topicSelect.value || "";
}

$("adminQuestionCategory")?.addEventListener("change", () => populateAdminSubtopics(""));
$("adminQuestionTopic")?.addEventListener("change", () => { adminSelectedSubtopicName = $("adminQuestionTopic").value || ""; });
$("adminQuestionSearch")?.addEventListener("input", () => renderAdminQuestionList(adminQuestions));

function updateAdminQuestionTypeFields() { // Schaltet die passenden Antwortfelder je nach Fragetyp um.
    const type = $("adminQuestionType")?.value || "multiple_choice"; // Aktuell gewählter Fragetyp.
    $("adminMultipleChoiceFields")?.classList.toggle("hidden", type !== "multiple_choice"); // Versteckt A-D bei Freitext.
    $("adminFreeTextFields")?.classList.toggle("hidden", type !== "free_text"); // Zeigt die Freitext-Erwartung bei Freitext.
    const a = $("adminQuestionAnswerA"); const b = $("adminQuestionAnswerB"); const c = $("adminQuestionAnswerC"); const d = $("adminQuestionAnswerD"); // Multiple-Choice-Felder.
    [a,b,c,d].forEach((field) => { if (field) field.required = type === "multiple_choice"; }); // Setzt die richtige Pflichtlogik.
    const correct = $("adminQuestionCorrectAnswer"); if (correct) correct.required = type === "multiple_choice"; // Macht die Auswahl nur bei A-D verpflichtend.
    const free = $("adminQuestionFreeTextAnswer"); if (free) free.required = type === "free_text"; // Macht die erwartete Antwort nur bei Freitext verpflichtend.
}

$("adminQuestionType")?.addEventListener("change", updateAdminQuestionTypeFields); // Reagiert auf den Fragetyp.
$("adminQuestionImage")?.addEventListener("change", () => { const file = $("adminQuestionImage").files?.[0]; const preview = $("adminQuestionImagePreview"); const remove = $("removeAdminQuestionImage"); if (!file || !preview) return; if (!file.type.startsWith("image/")) { setMessage($("adminQuestionMessage"), "Bitte eine Bilddatei auswählen."); $("adminQuestionImage").value = ""; return; } if (file.size > 5 * 1024 * 1024) { setMessage($("adminQuestionMessage"), "Das Bild darf maximal 5 MB groß sein."); $("adminQuestionImage").value = ""; return; } const url = URL.createObjectURL(file); preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Neue Bildvorschau">`; preview.classList.remove("hidden"); remove?.classList.remove("hidden"); }); // Prüft Bild und zeigt die Vorschau.
$("removeAdminQuestionImage")?.addEventListener("click", () => { $("adminQuestionImage").value = ""; $("adminQuestionImagePath").value = ""; $("adminQuestionImagePreview").classList.add("hidden"); $("adminQuestionImagePreview").innerHTML = ""; $("removeAdminQuestionImage").classList.add("hidden"); $("removeAdminQuestionImage").dataset.remove = "true"; }); // Entfernt die aktuelle Bildzuordnung.

function resetAdminQuestionForm() { // Setzt das Frageformular für eine neue Frage zurück.
    $("adminQuestionForm")?.reset();
    $("adminQuestionId").value = "";
    $("adminQuestionType").value = "multiple_choice";
    $("adminQuestionImagePath").value = "";
    $("adminQuestionImage").value = "";
    $("adminQuestionImagePreview").classList.add("hidden");
    $("adminQuestionImagePreview").innerHTML = "";
    $("removeAdminQuestionImage").classList.add("hidden");
    $("removeAdminQuestionImage").dataset.remove = "false";
    $("adminQuestionFreeTextAnswer").value = "";
    $("adminQuestionEditTitle").textContent = "Neue Frage";
    $("adminQuestionEditPanel").classList.remove("hidden");
    $("duplicateAdminQuestionButton").classList.add("hidden");
    updateAdminQuestionTypeFields();
}

$("newAdminQuestionButton")?.addEventListener("click", () => {
    resetAdminQuestionForm();
    populateAdminQuestionTopicSelects();
    $("adminQuestionCategory").value = "";
    $("adminQuestionTopic").innerHTML = `<option value="">Erst Hauptthema auswählen ...</option>`;
    $("adminQuestionExam").value = "";
}); // Öffnet eine neue Frage mit bewusster Themenauswahl.
$("cancelAdminQuestionEdit")?.addEventListener("click", () => $("adminQuestionEditPanel").classList.add("hidden"));

function editAdminQuestion(id) { // Füllt das Formular mit einer bestehenden Frage.
    const question = adminQuestions.find((item) => Number(item.id) === Number(id));
    if (!question) return;
    $("adminQuestionId").value = question.id;
    $("adminQuestionCategory").value = ADMIN_FIXED_MAIN_TOPICS.includes(question.category) ? question.category : "Sonstiges";
    populateAdminSubtopics(question.topic || "");
    $("adminQuestionTopic").value = question.topic || "";
    populateAdminQuestionExamSelect(Array.isArray(question.exam_ids) ? question.exam_ids : []);
    $("adminQuestionDifficulty").value = question.difficulty || "mittel";
    $("adminQuestionExamPart").value = question.exam_part || "";
    $("adminQuestionText").value = question.question || "";
    $("adminQuestionAnswerA").value = question.answer_a || "";
    $("adminQuestionAnswerB").value = question.answer_b || "";
    $("adminQuestionAnswerC").value = question.answer_c || "";
    $("adminQuestionAnswerD").value = question.answer_d || "";
    $("adminQuestionCorrectAnswer").value = question.correct_answer || "a";
    $("adminQuestionType").value = question.question_type || "multiple_choice";
    $("adminQuestionFreeTextAnswer").value = question.free_text_answer || "";
    $("adminQuestionImagePath").value = question.image_path || "";
    $("adminQuestionImage").value = "";
    $("removeAdminQuestionImage").dataset.remove = "false";
    const existingImage = question.image_path ? getQuestionImageUrl(question.image_path) : ""; // Bildvorschau für bestehende Fragen.
    if (existingImage) { $("adminQuestionImagePreview").innerHTML = `<img src="${escapeHtml(existingImage)}" alt="Bild zur Frage">`; $("adminQuestionImagePreview").classList.remove("hidden"); $("removeAdminQuestionImage").classList.remove("hidden"); } else { $("adminQuestionImagePreview").classList.add("hidden"); $("adminQuestionImagePreview").innerHTML = ""; $("removeAdminQuestionImage").classList.add("hidden"); }
    $("adminQuestionExplanation").value = question.explanation || "";
    $("adminQuestionEditTitle").textContent = `Frage #${question.id} bearbeiten`;
    updateAdminQuestionTypeFields();
    $("duplicateAdminQuestionButton").classList.remove("hidden");
    $("adminQuestionEditPanel").classList.remove("hidden");
}

async function deleteAdminQuestion(id) { // Löscht eine Frage nach Bestätigung.
    if (!confirm("Diese Frage wirklich löschen?")) return;
    const questionToDelete = adminQuestions.find((item) => Number(item.id) === Number(id)); // Sichert den Bildpfad vor dem Löschen.
    const { error } = await db.from("questions").delete().eq("id", id);
    if (error) {
        setMessage($("adminQuestionMessage"), "Frage konnte nicht gelöscht werden: " + error.message);
        return;
    }
    if (questionToDelete?.image_path) await db.storage.from("question-images").remove([questionToDelete.image_path]); // Entfernt das zugehörige Bild.
    setMessage($("adminQuestionMessage"), "Frage gelöscht.", "success");
    await loadAdminQuestions();
}

$("duplicateAdminQuestionButton")?.addEventListener("click", () => {
    $("adminQuestionId").value = "";
    $("adminQuestionEditTitle").textContent = "Frage duplizieren";
});

$("adminQuestionForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("adminQuestionId").value;
    const type = $("adminQuestionType").value || "multiple_choice"; // Gewählter Fragetyp.
    const oldImagePath = $("adminQuestionImagePath").value || null; // Bestehender Bildpfad.
    const removeImage = $("removeAdminQuestionImage").dataset.remove === "true"; // Prüft, ob das Bild entfernt werden soll.
    const category = $("adminQuestionCategory").value.trim();
    const topic = $("adminQuestionTopic").value.trim();
    const examValue = $("adminQuestionExam").value;
    if (!ADMIN_FIXED_MAIN_TOPICS.includes(category)) { setMessage($("adminQuestionMessage"), "Bitte ein gültiges Hauptthema auswählen."); return; }
    if (!topic) { setMessage($("adminQuestionMessage"), "Bitte ein Unterthema auswählen."); return; }
    if (!examValue && examValue !== "__MULTIPLE__") {
        // Nur Fragenmodus ist die gültige Standardzuordnung.
    }
    const selectedExam = examValue && examValue !== "__MULTIPLE__" ? adminExamItems.find((exam) => Number(exam.id) === Number(examValue)) : null;
    const payload = {
        category,
        topic,
        question: $("adminQuestionText").value.trim(),
        answer_a: type === "multiple_choice" ? $("adminQuestionAnswerA").value.trim() : null,
        answer_b: type === "multiple_choice" ? $("adminQuestionAnswerB").value.trim() : null,
        answer_c: type === "multiple_choice" ? $("adminQuestionAnswerC").value.trim() : null,
        answer_d: type === "multiple_choice" ? $("adminQuestionAnswerD").value.trim() : null,
        correct_answer: type === "multiple_choice" ? $("adminQuestionCorrectAnswer").value : null,
        explanation: $("adminQuestionExplanation").value.trim(),
        difficulty: $("adminQuestionDifficulty").value,
        exam_part: selectedExam?.exam_part || null,
        question_type: type,
        free_text_answer: type === "free_text" ? $("adminQuestionFreeTextAnswer").value.trim() : null,
        image_path: removeImage ? null : oldImagePath
    };
    try {
        let savedId = Number(id) || null; // Bestehende ID oder neue Frage.
        if (savedId) { const result = await db.from("questions").update(payload).eq("id", savedId); if (result.error) throw result.error; } else { const result = await db.from("questions").insert(payload).select("id").single(); if (result.error) throw result.error; savedId = result.data.id; }
        const previousExamIds = adminQuestionExamAssignments.get(Number(savedId)) || [];
        if (examValue !== "__MULTIPLE__") {
            const { error: removeAssignmentError } = await db.from("exam_set_questions").delete().eq("question_id", savedId);
            if (removeAssignmentError) throw removeAssignmentError;
            if (selectedExam) {
                const { data: positions, error: positionError } = await db.from("exam_set_questions").select("position").eq("exam_id", selectedExam.id).order("position", { ascending: false }).limit(1);
                if (positionError) throw positionError;
                const nextPosition = Number(positions?.[0]?.position || 0) + 1;
                const { error: assignmentInsertError } = await db.from("exam_set_questions").insert({ exam_id: Number(selectedExam.id), question_id: Number(savedId), position: nextPosition });
                if (assignmentInsertError) throw assignmentInsertError;
            }
        } else if (!previousExamIds.length) {
            setMessage($("adminQuestionMessage"), "Mehrfachzuordnung konnte nicht beibehalten werden.");
            return;
        }
        const imageFile = $("adminQuestionImage").files?.[0]; // Neu ausgewähltes Bild.
        if (imageFile) { const safeName = imageFile.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-"); const imagePath = `${currentUser.id}/${savedId}-${Date.now()}-${safeName}`; const upload = await db.storage.from("question-images").upload(imagePath, imageFile, { upsert: false, contentType: imageFile.type }); if (upload.error) throw upload.error; const updateImage = await db.from("questions").update({ image_path: imagePath }).eq("id", savedId); if (updateImage.error) throw updateImage.error; if (oldImagePath && oldImagePath !== imagePath) await db.storage.from("question-images").remove([oldImagePath]); } else if (removeImage && oldImagePath) { await db.storage.from("question-images").remove([oldImagePath]); }
        $("adminQuestionEditPanel").classList.add("hidden");
        setMessage($("adminQuestionMessage"), "Frage gespeichert.", "success");
        await loadAdminQuestions();
    } catch (error) {
        setMessage($("adminQuestionMessage"), "Frage konnte nicht gespeichert werden: " + error.message);
    }
});


function exportAdminQuestions() { // Exportiert den aktuellen Fragenbestand als JSON.
    const payload = adminQuestions.map((question) => ({
        category: question.category || "",
        topic: question.topic || "",
        question: question.question || "",
        answer_a: question.answer_a || "",
        answer_b: question.answer_b || "",
        answer_c: question.answer_c || "",
        answer_d: question.answer_d || "",
        correct_answer: question.correct_answer || "a",
        explanation: question.explanation || "",
        difficulty: question.difficulty || "mittel",
        exam_part: question.exam_part || null,
        question_type: question.question_type || "multiple_choice",
        free_text_answer: question.free_text_answer || "",
        image_path: question.image_path || null
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "egs-fragen-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
}
$("exportAdminQuestionsButton")?.addEventListener("click", exportAdminQuestions);

$("importAdminQuestionsInput")?.addEventListener("change", async (event) => { // Validiert und importiert Fragen aus einer JSON-Datei.
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const parsed = JSON.parse(await file.text());
        if (!Array.isArray(parsed)) throw new Error("Die JSON-Datei muss ein Array enthalten.");
        const allowed = ["category","topic","question","answer_a","answer_b","answer_c","answer_d","correct_answer","explanation","difficulty","exam_part","question_type","free_text_answer","image_path"];
        const rows = parsed.map((item, index) => {
            if (!item || typeof item !== "object") throw new Error(`Eintrag ${index + 1} ist ungültig.`);
            if (typeof item.category !== "string" || typeof item.topic !== "string" || typeof item.question !== "string" || typeof item.explanation !== "string") throw new Error(`Eintrag ${index + 1}: Pflichtfelder fehlen.`);
            const type = item.question_type === "free_text" ? "free_text" : "multiple_choice"; // Standard bleibt A-D.
            if (type === "multiple_choice" && !["a","b","c","d"].includes(String(item.correct_answer).toLowerCase())) throw new Error(`Eintrag ${index + 1}: correct_answer muss bei Mehrfachauswahl a, b, c oder d sein.`);
            if (type === "free_text" && typeof item.free_text_answer !== "string") throw new Error(`Eintrag ${index + 1}: free_text_answer fehlt.`);
            return {
                category: item.category.trim(),
                topic: item.topic.trim(),
                question: item.question.trim(),
                answer_a: type === "multiple_choice" ? String(item.answer_a || "").trim() : null,
                answer_b: type === "multiple_choice" ? String(item.answer_b || "").trim() : null,
                answer_c: type === "multiple_choice" ? String(item.answer_c || "").trim() : null,
                answer_d: type === "multiple_choice" ? String(item.answer_d || "").trim() : null,
                correct_answer: type === "multiple_choice" ? String(item.correct_answer).toLowerCase() : null,
                explanation: item.explanation.trim(),
                difficulty: item.difficulty || "mittel",
                exam_part: item.exam_part || null,
                question_type: type,
                free_text_answer: type === "free_text" ? item.free_text_answer.trim() : null,
                image_path: typeof item.image_path === "string" && item.image_path.trim() ? item.image_path.trim() : null
            };
        });
        if (!rows.length) throw new Error("Die Datei enthält keine Fragen.");
        const { error } = await db.from("questions").insert(rows);
        if (error) throw error;
        event.target.value = "";
        setMessage($("adminQuestionMessage"), `${rows.length} Fragen importiert.`, "success");
        await loadAdminQuestions();
    } catch (error) {
        event.target.value = "";
        setMessage($("adminQuestionMessage"), "Import fehlgeschlagen: " + error.message);
    }
});

function openAdminTopicModal() { // Öffnet das Themenfenster im Admin.
    adminTopicParentId = null;
    $("adminTopicForm").classList.add("hidden");
    $("adminTopicBackButton").classList.add("hidden");
    $("newAdminSubtopicButton").classList.add("hidden");
    $("adminTopicModalTitle").textContent = "Themen";
    renderAdminTopicModal();
    $("adminTopicModal").classList.remove("hidden");
    $("adminTopicModal").setAttribute("aria-hidden", "false");
    document.body.classList.add("admin-topic-modal-open");
}

function closeAdminTopicModal() { // Schließt das Themenfenster im Admin.
    $("adminTopicModal")?.classList.add("hidden");
    $("adminTopicModal")?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("admin-topic-modal-open");
}

function renderAdminTopicModal() { // Zeichnet Themen oder Unterthemen im Adminfenster.
    const content = $("adminTopicModalContent");
    if (!content) return;
    const items = adminTopicParentId === null ? getAdminRootTopics() : getAdminChildren(adminTopicParentId);
    content.innerHTML = items.length ? items.map((item) => `<article class="admin-topic-modal-item"><button type="button" class="admin-topic-modal-open" data-admin-topic-open="${item.id}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || "Keine Beschreibung")}</small></button><div class="admin-actions"><button type="button" data-admin-topic-edit="${item.id}">Bearbeiten</button><button type="button" class="danger-button" data-admin-topic-delete="${item.id}">Löschen</button></div></article>`).join("") : `<div class="placeholder-card"><h2>Noch nichts vorhanden</h2><p>Lege den ersten Eintrag an.</p></div>`;
    content.querySelectorAll("[data-admin-topic-open]").forEach((button) => button.addEventListener("click", () => {
        adminTopicParentId = Number(button.dataset.adminTopicOpen);
        const current = adminTopics.find((topic) => Number(topic.id) === adminTopicParentId);
        $("adminTopicModalTitle").textContent = current?.name || "Unterthemen";
        $("adminTopicBackButton").classList.remove("hidden");
        $("newAdminSubtopicButton").classList.remove("hidden");
        $("newAdminTopicButton").classList.add("hidden");
        renderAdminTopicModal();
    }));
    content.querySelectorAll("[data-admin-topic-edit]").forEach((button) => button.addEventListener("click", () => editAdminTopic(Number(button.dataset.adminTopicEdit))));
    content.querySelectorAll("[data-admin-topic-delete]").forEach((button) => button.addEventListener("click", () => deleteAdminTopic(Number(button.dataset.adminTopicDelete))));
}

function showAdminTopicForm(parentId = null, item = null) { // Öffnet das Formular für ein Thema oder Unterthema.
    $("adminTopicId").value = item?.id || "";
    $("adminTopicParentId").value = parentId ?? "";
    $("adminTopicName").value = item?.name || "";
    $("adminTopicDescription").value = item?.description || "";
    $("adminTopicSortOrder").value = item?.sort_order ?? 0;
    $("adminTopicActive").checked = item ? item.is_active !== false : true;
    $("adminTopicForm").classList.remove("hidden");
    $("adminTopicName").focus();
}

function editAdminTopic(id) { // Bearbeitet ein bestehendes Thema.
    const item = adminTopics.find((topic) => Number(topic.id) === Number(id));
    if (item) showAdminTopicForm(item.parent_id, item);
}

async function deleteAdminTopic(id) { // Löscht ein Thema nur, wenn es nicht von Fragen verwendet wird.
    const item = adminTopics.find((topic) => Number(topic.id) === Number(id));
    if (!item) return;
    const parent = item.parent_id ? adminTopics.find((topic) => Number(topic.id) === Number(item.parent_id)) : null;
    let questionQuery = db.from("questions").select("id", { count: "exact", head: true });
    questionQuery = item.parent_id ? questionQuery.eq("category", parent?.name || "").eq("topic", item.name) : questionQuery.eq("category", item.name);
    const { count, error: countError } = await questionQuery;
    if (countError) {
        setMessage($("adminTopicFormMessage"), "Verwendung konnte nicht geprüft werden: " + countError.message);
        return;
    }
    if ((count || 0) > 0) {
        setMessage($("adminTopicFormMessage"), `Der Eintrag wird von ${count} Fragen verwendet und kann deshalb nicht gelöscht werden.`);
        return;
    }
    const children = getAdminChildren(id);
    if (children.length && !confirm("Dieses Thema enthält Unterthemen. Trotzdem löschen?")) return;
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const { error } = await db.from("learning_topics").delete().eq("id", id);
    if (error) {
        setMessage($("adminTopicFormMessage"), "Eintrag konnte nicht gelöscht werden: " + error.message);
        return;
    }
    await loadAdminTopics();
    renderAdminTopicModal();
}

$("openAdminTopicManager")?.addEventListener("click", openAdminTopicModal);
$("closeAdminTopicModal")?.addEventListener("click", closeAdminTopicModal);
$("newAdminTopicButton")?.addEventListener("click", () => showAdminTopicForm(null));
$("newAdminSubtopicButton")?.addEventListener("click", () => showAdminTopicForm(adminTopicParentId));
$("cancelAdminTopicForm")?.addEventListener("click", () => $("adminTopicForm").classList.add("hidden"));
$("adminTopicBackButton")?.addEventListener("click", () => {
    adminTopicParentId = null;
    $("adminTopicModalTitle").textContent = "Themen";
    $("adminTopicBackButton").classList.add("hidden");
    $("newAdminSubtopicButton").classList.add("hidden");
    $("newAdminTopicButton").classList.remove("hidden");
    renderAdminTopicModal();
});
document.querySelector("#adminTopicModal")?.addEventListener("click", (event) => {
    if (event.target.matches("[data-admin-topic-close='true']")) closeAdminTopicModal();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAdminTopicModal();
});

$("adminTopicForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("adminTopicId").value;
    const parentId = $("adminTopicParentId").value ? Number($("adminTopicParentId").value) : null;
    const payload = {
        parent_id: parentId,
        name: $("adminTopicName").value.trim(),
        description: $("adminTopicDescription").value.trim() || null,
        sort_order: Number($("adminTopicSortOrder").value || 0),
        is_active: $("adminTopicActive").checked
    };
    if (!payload.name) return;
    try {
        const result = id ? await db.from("learning_topics").update(payload).eq("id", id) : await db.from("learning_topics").insert(payload);
        if (result.error) throw result.error;
        $("adminTopicForm").classList.add("hidden");
        setMessage($("adminTopicFormMessage"), "Thema gespeichert.", "success");
        await loadAdminTopics();
        renderAdminTopicModal();
    } catch (error) {
        setMessage($("adminTopicFormMessage"), "Thema konnte nicht gespeichert werden: " + error.message);
    }
});

// ADMIN RECHNER – verwaltet die dynamischen Rechner.
async function loadAdminCalculators() {
    const list = $("adminCalculatorList");
    if (!list) return;
    list.innerHTML = "<p>Rechner werden geladen ...</p>";
    try {
        const { data, error } = await db.from("calculators").select("id,title,category,symbol,description,calculation_type,is_active,sort_order").order("sort_order").order("title");
        if (error) throw error;
        adminCalculators = data || [];
        list.innerHTML = adminCalculators.length ? adminCalculators.map((item) => `<article class="admin-calculator-row"><div><strong>${escapeHtml(item.symbol || "⌁")} · ${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.calculation_type)} · ${item.is_active ? "aktiv" : "inaktiv"}</small><p>${escapeHtml(item.description || "")}</p></div><div class="admin-actions"><button type="button" data-admin-calculator-edit="${item.id}">Bearbeiten</button><button type="button" class="danger-button" data-admin-calculator-delete="${item.id}">Löschen</button></div></article>`).join("") : "<p>Noch keine Rechner vorhanden.</p>";
        list.querySelectorAll("[data-admin-calculator-edit]").forEach((button) => button.addEventListener("click", () => editAdminCalculator(Number(button.dataset.adminCalculatorEdit))));
        list.querySelectorAll("[data-admin-calculator-delete]").forEach((button) => button.addEventListener("click", () => deleteAdminCalculator(Number(button.dataset.adminCalculatorDelete))));
    } catch (error) {
        setMessage($("adminCalculatorMessage"), "Rechner konnten nicht geladen werden: " + error.message);
    }
}

function resetAdminCalculatorForm() { // Setzt das Rechnerformular zurück.
    $("adminCalculatorForm")?.reset();
    $("adminCalculatorId").value = "";
    $("adminCalculatorEditTitle").textContent = "Neuer Rechner";
    $("adminCalculatorActive").checked = true;
}

function editAdminCalculator(id) { // Bearbeitet einen bestehenden Rechner.
    const item = adminCalculators.find((calculator) => Number(calculator.id) === Number(id));
    if (!item) return;
    $("adminCalculatorId").value = item.id;
    $("adminCalculatorTitle").value = item.title || "";
    $("adminCalculatorCategory").value = item.category || "";
    $("adminCalculatorSymbol").value = item.symbol || "";
    $("adminCalculatorType").value = item.calculation_type || "ohm";
    $("adminCalculatorSortOrder").value = item.sort_order || 0;
    $("adminCalculatorActive").checked = item.is_active !== false;
    $("adminCalculatorDescription").value = item.description || "";
    $("adminCalculatorEditTitle").textContent = `Rechner #${item.id} bearbeiten`;
    $("adminCalculatorEditPanel").classList.remove("hidden");
}

$("newAdminCalculatorButton")?.addEventListener("click", () => {
    resetAdminCalculatorForm();
    $("adminCalculatorEditPanel").classList.remove("hidden");
});

$("cancelAdminCalculatorEdit")?.addEventListener("click", () => $("adminCalculatorEditPanel").classList.add("hidden"));
$("resetAdminCalculatorForm")?.addEventListener("click", resetAdminCalculatorForm);

$("adminCalculatorForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("adminCalculatorId").value;
    const payload = {
        title: $("adminCalculatorTitle").value.trim(),
        category: $("adminCalculatorCategory").value.trim(),
        symbol: $("adminCalculatorSymbol").value.trim() || "⌁",
        description: $("adminCalculatorDescription").value.trim() || null,
        calculation_type: $("adminCalculatorType").value,
        sort_order: Number($("adminCalculatorSortOrder").value || 0),
        is_active: $("adminCalculatorActive").checked
    };
    try {
        const result = id ? await db.from("calculators").update(payload).eq("id", id) : await db.from("calculators").insert(payload);
        if (result.error) throw result.error;
        $("adminCalculatorEditPanel").classList.add("hidden");
        setMessage($("adminCalculatorMessage"), "Rechner gespeichert.", "success");
        await loadAdminCalculators();
    } catch (error) {
        setMessage($("adminCalculatorMessage"), "Rechner konnte nicht gespeichert werden: " + error.message);
    }
});

async function deleteAdminCalculator(id) { // Löscht einen Rechner nach Bestätigung.
    if (!confirm("Diesen Rechner wirklich löschen?")) return;
    const { error } = await db.from("calculators").delete().eq("id", id);
    if (error) {
        setMessage($("adminCalculatorMessage"), "Rechner konnte nicht gelöscht werden: " + error.message);
        return;
    }
    setMessage($("adminCalculatorMessage"), "Rechner gelöscht.", "success");
    await loadAdminCalculators();
}

// ADMIN STATISTIK – liest portalweite Daten nur für Admins.
async function loadAdminStatistics() { // Liest portalweite Kennzahlen nur für Admins.
    const ids = ["adminStatUsers","adminStatQuestions","adminStatAnswers","adminStatLearningEvents","adminStatExams","adminStatAttempts"];
    ids.forEach((id) => { if ($(id)) $(id).textContent = "…"; });
    try {
        const [profilesCount, questionsCount, eventsCount, answersCount, examsCount, attemptsCount, eventsData, questionsData, profilesData] = await Promise.all([
            db.from("profiles").select("id", { count: "exact", head: true }),
            db.from("questions").select("id", { count: "exact", head: true }),
            db.from("learning_events").select("id", { count: "exact", head: true }),
            db.from("learning_events").select("id", { count: "exact", head: true }).eq("event_type", "question_answered"),
            db.from("exam_sets").select("id", { count: "exact", head: true }),
            db.from("exam_attempts").select("id", { count: "exact", head: true }),
            db.from("learning_events").select("event_type").eq("event_type", "question_answered").limit(5000),
            db.from("questions").select("category").limit(5000),
            db.from("profiles").select("created_at").limit(5000)
        ]);
        [profilesCount, questionsCount, eventsCount, answersCount, examsCount, attemptsCount, eventsData, questionsData, profilesData].forEach((result) => { if (result.error) throw result.error; });
        $("adminStatUsers").textContent = String(profilesCount.count ?? 0);
        $("adminStatQuestions").textContent = String(questionsCount.count ?? 0);
        $("adminStatAnswers").textContent = String(answersCount.count ?? 0);
        $("adminStatLearningEvents").textContent = String(eventsCount.count ?? 0);
        $("adminStatExams").textContent = String(examsCount.count ?? 0);
        $("adminStatAttempts").textContent = String(attemptsCount.count ?? 0);
        const categoryCounts = {};
        (questionsData.data || []).forEach((item) => { const name = item.category || "Ohne Thema"; categoryCounts[name] = (categoryCounts[name] || 0) + 1; });
        $("adminStatTopicsDetail").innerHTML = Object.entries(categoryCounts).sort((a,b) => b[1]-a[1]).map(([name,count]) => `<div class="admin-stat-detail-row"><span>${escapeHtml(name)}</span><strong>${count}</strong></div>`).join("") || "<p>Keine Fragen.</p>";
        const userMonths = {};
        (profilesData.data || []).forEach((item) => { const month = item.created_at ? new Date(item.created_at).toLocaleDateString("de-DE",{year:"numeric",month:"2-digit"}) : "–"; userMonths[month] = (userMonths[month] || 0) + 1; });
        $("adminStatUsersDetail").innerHTML = Object.entries(userMonths).sort().reverse().map(([name,count]) => `<div class="admin-stat-detail-row"><span>${escapeHtml(name)}</span><strong>${count}</strong></div>`).join("") || "<p>Keine Benutzer.</p>";
    } catch (error) {
        ids.forEach((id) => { if ($(id)) $(id).textContent = "–"; });
        setMessage($("adminQuestionMessage"), "Admin-Statistik konnte nicht geladen werden: " + error.message);
    }
}

// KALENDER POPUP – zeigt den ausgewählten Lerntag als Fenster.
function openCalendarModal(title, html) { // Öffnet das Tagesdetailfenster.
    $("calendarModalTitle").textContent = title;
    $("calendarModalContent").innerHTML = html;
    $("calendarModal").classList.remove("hidden");
    $("calendarModal").setAttribute("aria-hidden", "false");
    document.body.classList.add("calendar-modal-open");
}
function closeCalendarModal() { // Schließt das Tagesdetailfenster.
    $("calendarModal")?.classList.add("hidden");
    $("calendarModal")?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("calendar-modal-open");
}
$("closeCalendarModal")?.addEventListener("click", closeCalendarModal);
document.querySelector("#calendarModal")?.addEventListener("click", (event) => { if (event.target.matches("[data-calendar-close='true']")) closeCalendarModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeAdminTopicModal(); closeCalendarModal(); } });


// FORMELRECHNER – lädt Rechner aus Supabase.
async function loadCalculators() {
    const grid = $("calculatorGrid");
    const message = $("calculatorMessage");
    if (!grid) return;
    grid.innerHTML = `<div class="placeholder-card"><div class="placeholder-icon">⌁</div><h2>Rechner werden geladen ...</h2><p>Bitte einen Moment warten.</p></div>`;
    try {
        const { data, error } = await db.from("calculators").select("id,title,category,symbol,description,calculation_type,is_active,sort_order").eq("is_active", true).order("sort_order").order("title");
        if (error) throw error;
        const calculators = data || [];
        if (!calculators.length) {
            grid.innerHTML = `<div class="placeholder-card"><div class="placeholder-icon">⌁</div><h2>Noch keine Rechner vorhanden</h2><p>Im Admin-Bereich können Rechner angelegt werden.</p></div>`;
            return;
        }
        grid.innerHTML = calculators.map((calculator) => renderCalculatorCard(calculator)).join("");
        bindDynamicCalculators();
        setMessage(message, "");
    } catch (error) {
        grid.innerHTML = `<div class="placeholder-card"><div class="placeholder-icon">⚠</div><h2>Rechner konnten nicht geladen werden</h2><p>${escapeHtml(error.message)}</p></div>`;
        setMessage(message, "Rechner konnten nicht geladen werden: " + error.message);
    }
}

function renderCalculatorCard(calculator) { // Baut automatische Rechner ohne manuelle Auswahl des gesuchten Wertes.
    const type = calculator.calculation_type;
    let body = "";
    if (type === "ohm") {
        body = `<div class="calc-inputs"><label>U<input data-calc-input="u" type="number" step="any" placeholder="V"></label><label>R<input data-calc-input="r" type="number" step="any" placeholder="Ω"></label><label>I<input data-calc-input="i" type="number" step="any" placeholder="A"></label></div><p class="auto-calculator-note">Zwei Werte eingeben – der freie Wert wird automatisch berechnet.</p>`;
    } else if (type === "power") {
        body = `<div class="calc-inputs"><label>U<input data-calc-input="u" type="number" step="any" placeholder="V"></label><label>I<input data-calc-input="i" type="number" step="any" placeholder="A"></label><label>P<input data-calc-input="p" type="number" step="any" placeholder="W"></label></div><p class="auto-calculator-note">Zwei Werte eingeben – der freie Wert wird automatisch berechnet.</p>`;
    } else if (type === "energy") {
        body = `<div class="calc-inputs"><label>E<input data-calc-input="e" type="number" step="any" placeholder="Wh"></label><label>P<input data-calc-input="p" type="number" step="any" placeholder="W"></label><label>t<input data-calc-input="t" type="number" step="any" placeholder="h"></label></div><p class="auto-calculator-note">Zwei Werte eingeben – der freie Wert wird automatisch berechnet.</p>`;
    } else if (type === "frequency") {
        body = `<div class="calc-inputs"><label>Frequenz f<input data-calc-input="f" type="number" step="any" placeholder="Hz"></label><label>Periodendauer T<input data-calc-input="t" type="number" step="any" placeholder="s"></label></div><p class="auto-calculator-note">Einen Wert eingeben – der andere wird automatisch berechnet.</p>`;
    } else if (type === "conversion") {
        body = `<div class="calc-row"><label>Umrechnung<select data-calc-mode><option value="mv-v">mV → V</option><option value="v-mv">V → mV</option><option value="ma-a">mA → A</option><option value="a-ma">A → mA</option><option value="ohm-kohm">Ω → kΩ</option><option value="kohm-ohm">kΩ → Ω</option><option value="kohm-mohm">kΩ → MΩ</option><option value="mohm-kohm">MΩ → kΩ</option><option value="hz-khz">Hz → kHz</option><option value="khz-hz">kHz → Hz</option><option value="khz-mhz">kHz → MHz</option><option value="mhz-khz">MHz → kHz</option><option value="mhz-hz">MHz → Hz</option><option value="hz-mhz">Hz → MHz</option></select></label></div><label>Wert<input data-calc-input="value" type="number" step="any" placeholder="Wert eingeben"></label>`;
    } else {
        body = `<p>Dieser Rechner wird derzeit nicht unterstützt.</p>`;
    }
    return `<article class="calculator-card" data-calculator-type="${escapeHtml(type)}"><div class="calculator-title"><span>${escapeHtml(calculator.symbol || "⌁")}</span><div><h2>${escapeHtml(calculator.title)}</h2><p>${escapeHtml(calculator.description || calculator.category || "")}</p></div></div>${body}<button type="button" data-calc-run>Berechnen</button><div class="result-box" data-calc-result>Ergebnis erscheint hier.</div></article>`;
}

function bindDynamicCalculators() { // Verbindet Rechner mit Klick- und Echtzeitberechnung.
    const calculateCard = (card) => {
        const type = card.dataset.calculatorType;
        const result = card.querySelector("[data-calc-result]");
        const value = (name) => {
            const input = card.querySelector(`[data-calc-input="${name}"]`);
            if (!input || input.value.trim() === "") return null;
            const number = Number(input.value);
            return Number.isFinite(number) ? number : null;
        };
        const modeElement = card.querySelector("[data-calc-mode]");
        const mode = modeElement ? modeElement.value : "";
        let text = "Bitte die benötigten Werte eingeben.";
        if (type === "ohm") {
            const u = value("u"), r = value("r"), i = value("i");
            if (u === null && r !== null && i !== null) { const x = r * i; const input = card.querySelector('[data-calc-input="u"]'); input.value = x; input.dataset.calcAuto = "true"; text = `U = ${formatNumber(x)} V`; }
            else if (r === null && u !== null && i !== null && i !== 0) { const x = u / i; const input = card.querySelector('[data-calc-input="r"]'); input.value = x; input.dataset.calcAuto = "true"; text = `R = ${formatNumber(x)} Ω`; }
            else if (i === null && u !== null && r !== null && r !== 0) { const x = u / r; const input = card.querySelector('[data-calc-input="i"]'); input.value = x; input.dataset.calcAuto = "true"; text = `I = ${formatNumber(x)} A`; }
            else if (u !== null && r !== null && i !== null) text = "Alle drei Werte sind bereits ausgefüllt.";
        } else if (type === "power") {
            const u = value("u"), i = value("i"), p = value("p");
            if (p === null && u !== null && i !== null) { const x = u * i; const input = card.querySelector('[data-calc-input="p"]'); input.value = x; input.dataset.calcAuto = "true"; text = `P = ${formatNumber(x)} W`; }
            else if (u === null && p !== null && i !== null && i !== 0) { const x = p / i; const input = card.querySelector('[data-calc-input="u"]'); input.value = x; input.dataset.calcAuto = "true"; text = `U = ${formatNumber(x)} V`; }
            else if (i === null && p !== null && u !== null && u !== 0) { const x = p / u; const input = card.querySelector('[data-calc-input="i"]'); input.value = x; input.dataset.calcAuto = "true"; text = `I = ${formatNumber(x)} A`; }
            else if (u !== null && i !== null && p !== null) text = "Alle drei Werte sind bereits ausgefüllt.";
        } else if (type === "energy") {
            const e = value("e"), p = value("p"), t = value("t");
            if (e === null && p !== null && t !== null) { const x = p * t; const input = card.querySelector('[data-calc-input="e"]'); input.value = x; input.dataset.calcAuto = "true"; text = `E = ${formatNumber(x)} Wh`; }
            else if (p === null && e !== null && t !== null && t !== 0) { const x = e / t; const input = card.querySelector('[data-calc-input="p"]'); input.value = x; input.dataset.calcAuto = "true"; text = `P = ${formatNumber(x)} W`; }
            else if (t === null && e !== null && p !== null && p !== 0) { const x = e / p; const input = card.querySelector('[data-calc-input="t"]'); input.value = x; input.dataset.calcAuto = "true"; text = `t = ${formatNumber(x)} h`; }
            else if (e !== null && p !== null && t !== null) text = "Alle drei Werte sind bereits ausgefüllt.";
        } else if (type === "frequency") {
            const f = value("f"), t = value("t");
            if (f === null && t !== null && t !== 0) { const x = 1 / t; const input = card.querySelector('[data-calc-input="f"]'); input.value = x; input.dataset.calcAuto = "true"; text = `f = ${formatNumber(x)} Hz`; }
            else if (t === null && f !== null && f !== 0) { const x = 1 / f; const input = card.querySelector('[data-calc-input="t"]'); input.value = x; input.dataset.calcAuto = "true"; text = `T = ${formatNumber(x)} s`; }
            else if (f !== null && t !== null) text = "Beide Werte sind bereits ausgefüllt.";
        } else if (type === "conversion") {
            const input = value("value");
            const conversions = {"mv-v":[0.001,"V"],"v-mv":[1000,"mV"],"ma-a":[0.001,"A"],"a-ma":[1000,"mA"],"ohm-kohm":[0.001,"kΩ"],"kohm-ohm":[1000,"Ω"],"kohm-mohm":[0.001,"MΩ"],"mohm-kohm":[1000,"kΩ"],"hz-khz":[0.001,"kHz"],"khz-hz":[1000,"Hz"],"khz-mhz":[0.001,"MHz"],"mhz-khz":[1000,"kHz"],"mhz-hz":[1000000,"Hz"],"hz-mhz":[0.000001,"MHz"]};
            const conversion = conversions[mode];
            if (input !== null && conversion) text = `${formatNumber(input * conversion[0], 10)} ${conversion[1]}`;
        }
        if (result) result.textContent = text;
    };
    document.querySelectorAll("[data-calc-run]").forEach((button) => { button.addEventListener("click", () => calculateCard(button.closest("[data-calculator-type]"))); });
    document.querySelectorAll('[data-calculator-type="ohm"],[data-calculator-type="power"],[data-calculator-type="energy"],[data-calculator-type="frequency"]').forEach((card) => {
        card.querySelectorAll("[data-calc-input]").forEach((input) => input.addEventListener("input", () => { card.querySelectorAll('[data-calc-input][data-calc-auto="true"]').forEach((autoInput) => { if (autoInput !== input) { autoInput.value = ""; delete autoInput.dataset.calcAuto; } }); calculateCard(card); }));
    });
}

function setupMobileNavigation() { // Steuert das mobile Navigationsmenü.
    const menuButton = $("mobileMenuButton");
    const navigation = document.querySelector(".navigation");
    if (!menuButton || !navigation) return;
    menuButton.addEventListener("click", () => {
        const open = document.body.classList.toggle("mobile-nav-open");
        menuButton.setAttribute("aria-expanded", String(open));
    });
    navigation.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
            document.body.classList.remove("mobile-nav-open");
            menuButton.setAttribute("aria-expanded", "false");
        });
    });
}

function setupSettingsForms() { // Verbindet die Einstellungen mit Profil und Passwort.
    const usernameForm = $("settingsUsernameForm");
    const passwordForm = $("settingsPasswordForm");
    usernameForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const value = $("settingsUsernameInput").value.trim();
        if (value.length < 3) { setMessage($("settingsUsernameMessage"), "Der Benutzername muss mindestens 3 Zeichen lang sein."); return; }
        try {
            const { error } = await db.from("profiles").update({ username: value }).eq("id", currentUser.id);
            if (error) throw error;
            $("dashboardUsername").textContent = value;
            $("settingsUsername").textContent = value;
            setMessage($("settingsUsernameMessage"), "Benutzername gespeichert.", "success");
        } catch (error) {
            setMessage($("settingsUsernameMessage"), "Benutzername konnte nicht gespeichert werden: " + error.message);
        }
    });
    passwordForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = $("settingsPasswordInput").value;
        const confirm = $("settingsPasswordConfirm").value;
        if (password.length < 8 || password !== confirm) { setMessage($("settingsPasswordMessage"), "Bitte ein Passwort mit mindestens 8 Zeichen eingeben und korrekt wiederholen."); return; }
        try {
            const { error } = await db.auth.updateUser({ password });
            if (error) throw error;
            passwordForm.reset();
            setMessage($("settingsPasswordMessage"), "Passwort wurde geändert.", "success");
        } catch (error) {
            setMessage($("settingsPasswordMessage"), "Passwort konnte nicht geändert werden: " + error.message);
        }
    });
}

$("deleteOwnAccountButton")?.addEventListener("click", async () => { // Verbindet den persönlichen Kontolösch-Button.
    if (!currentUser) return; // Ohne Benutzer ist keine Löschung möglich.
    if (!confirm("Möchtest du dein Konto wirklich dauerhaft löschen? Alle persönlichen Lern- und Prüfungsdaten werden dabei gelöscht.")) return; // Bestätigt die endgültige Aktion.
    const button = $("deleteOwnAccountButton"); // Holt den Löschbutton.
    button.disabled = true; // Verhindert doppelte Klicks.
    setMessage($("settingsDeleteMessage"), "Konto wird gelöscht ..."); // Zeigt den Ladezustand.
    try {
        const { error } = await db.functions.invoke("delete-account", { body: { userId: currentUser.id } }); // Führt die geschützte Selbstlöschung serverseitig aus.
        if (error) throw error; // Übernimmt Fehler der Datenbankfunktion.
        await db.auth.signOut(); // Meldet die gelöschte Sitzung lokal ab.
        currentUser = null; // Entfernt den Benutzerstatus.
        currentUserIsAdmin = false; // Entfernt den Adminstatus.
        currentUserCreatedAt = null; // Entfernt den persönlichen Kalenderstart.
        examState = null; // Verwirft eine offene Prüfung.
        stopExamTimer(); // Stoppt den Prüfungstimer.
        showLogin(); // Zeigt die Anmeldung.
    } catch (error) {
        console.error("EIGENES KONTO LÖSCHEN:", error); // Schreibt technische Details in die Konsole.
        setMessage($("settingsDeleteMessage"), "Konto konnte nicht gelöscht werden: " + error.message); // Zeigt den Fehler.
        button.disabled = false; // Aktiviert den Button nach einem Fehler wieder.
    }
});

setupMobileNavigation(); // Aktiviert die mobile Navigation.
setupSettingsForms(); // Aktiviert die Einstellungen.


function setupAdminOverviewLinks() { // Öffnet das ausgewählte Admin-Modul.
    document.querySelectorAll(".admin-module-card[href^='#admin']").forEach((link) => {
        link.addEventListener("click", () => {
            const target = $(link.getAttribute("href").slice(1));
            if (target && target.tagName === "DETAILS") target.open = true;
        });
    });
}

checkCurrentUser();


// ========================= START =========================