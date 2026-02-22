# Blumè. Webapp - Das komplette Lernbuch

**Von Null zu React & Next.js** - Ein vollständiger Leitfaden, der dich vom Vanilla-Entwickler zum React-Entwickler macht.

---

## Wie dieses Buch aufgebaut ist

Dieses Buch erklärt dir die Blumè. To-Do App in der **Reihenfolge, wie man sie bauen würde**, wenn man bei Null anfängt. Wir beginnen mit dem "Warum" und arbeiten uns dann Schritt für Schritt durch jeden Teil.

**Für wen ist dieses Buch?**
- Du kennst HTML, CSS und Vanilla JavaScript
- Du möchtest verstehen, wie moderne Web-Apps gebaut werden
- Du willst nicht nur kopieren, sondern wirklich VERSTEHEN

---

# TEIL A: DAS FUNDAMENT
## Bevor wir eine Zeile Code schreiben

---

# Kapitel 1: Warum verlassen wir Vanilla HTML/CSS/JS?

## 1.1 Wie eine Vanilla-Webapp funktioniert

Stell dir vor, du baust eine einfache To-Do Liste mit purem HTML, CSS und JavaScript:

### Die HTML-Datei (index.html)

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meine To-Do App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>Meine To-Dos</h1>
        
        <form id="todo-form">
            <input type="text" id="todo-input" placeholder="Was willst du erledigen?">
            <button type="submit">Hinzufügen</button>
        </form>
        
        <ul id="todo-list">
            <!-- Hier werden die To-Dos per JavaScript eingefügt -->
        </ul>
    </div>
    
    <script src="app.js"></script>
</body>
</html>
```

### Die CSS-Datei (style.css)

```css
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
    padding: 20px;
}

#app {
    max-width: 500px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 10px;
}

h1 {
    margin-bottom: 20px;
}

#todo-form {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

#todo-input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

button {
    padding: 10px 20px;
    background: #222;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

#todo-list {
    list-style: none;
}

.todo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #f9f9f9;
    margin-bottom: 10px;
    border-radius: 5px;
}

.todo-item.completed {
    text-decoration: line-through;
    opacity: 0.6;
}
```

### Die JavaScript-Datei (app.js)

```javascript
// ====== DATEN (STATE) ======
let todos = [];

// ====== DOM-ELEMENTE HOLEN ======
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');

// ====== FUNKTIONEN ======

// Die komplette Liste neu rendern
function renderTodos() {
    // 1. Alles löschen was da ist
    list.innerHTML = '';
    
    // 2. Für jedes To-Do ein Element erstellen
    todos.forEach(function(todo, index) {
        // Ein <li> Element erstellen
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) {
            li.className += ' completed';
        }
        
        // Den Text hinzufügen
        const textSpan = document.createElement('span');
        textSpan.textContent = todo.text;
        li.appendChild(textSpan);
        
        // Buttons-Container
        const buttonsDiv = document.createElement('div');
        
        // Erledigt-Button
        const completeBtn = document.createElement('button');
        completeBtn.textContent = todo.completed ? 'Rückgängig' : 'Erledigt';
        completeBtn.onclick = function() {
            toggleComplete(index);
        };
        buttonsDiv.appendChild(completeBtn);
        
        // Löschen-Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Löschen';
        deleteBtn.style.marginLeft = '5px';
        deleteBtn.style.background = 'red';
        deleteBtn.onclick = function() {
            deleteTodo(index);
        };
        buttonsDiv.appendChild(deleteBtn);
        
        li.appendChild(buttonsDiv);
        
        // Das <li> zur Liste hinzufügen
        list.appendChild(li);
    });
}

// Ein neues To-Do hinzufügen
function addTodo(text) {
    todos.push({
        id: Date.now(),
        text: text,
        completed: false
    });
    renderTodos();  // UI aktualisieren!
    saveTodos();    // In localStorage speichern!
}

// Ein To-Do als erledigt markieren
function toggleComplete(index) {
    todos[index].completed = !todos[index].completed;
    renderTodos();  // UI aktualisieren!
    saveTodos();    // In localStorage speichern!
}

// Ein To-Do löschen
function deleteTodo(index) {
    todos.splice(index, 1);
    renderTodos();  // UI aktualisieren!
    saveTodos();    // In localStorage speichern!
}

// In localStorage speichern
function saveTodos() {
    localStorage.setItem('my-todos', JSON.stringify(todos));
}

// Aus localStorage laden
function loadTodos() {
    const saved = localStorage.getItem('my-todos');
    if (saved) {
        todos = JSON.parse(saved);
    }
    renderTodos();
}

// ====== EVENT LISTENER ======
form.addEventListener('submit', function(event) {
    event.preventDefault();  // Seite nicht neu laden!
    
    const text = input.value.trim();
    if (text) {
        addTodo(text);
        input.value = '';  // Input leeren
    }
});

// ====== APP STARTEN ======
loadTodos();
```

## 1.2 Die Probleme mit diesem Ansatz

Diese App funktioniert. Aber wenn sie wächst, entstehen ernsthafte Probleme:

### Problem 1: Manuelle DOM-Manipulation ist mühsam und fehleranfällig

```javascript
// Für JEDES Element musst du:
const li = document.createElement('li');       // 1. Element erstellen
li.className = 'todo-item';                    // 2. Klassen setzen
const textSpan = document.createElement('span'); // 3. Kind-Elemente erstellen
textSpan.textContent = todo.text;              // 4. Inhalt setzen
li.appendChild(textSpan);                      // 5. Zusammenfügen
// ... und so weiter für jeden Button, jedes div...
```

Das sind 15+ Zeilen Code nur für EIN To-Do-Element. Bei komplexen UIs wird das unübersichtlich.

### Problem 2: Die gesamte Liste wird jedes Mal neu gerendert

```javascript
function renderTodos() {
    list.innerHTML = '';  // ALLES löschen
    
    todos.forEach(function(todo, index) {
        // ALLES neu erstellen
    });
}
```

**Das Problem:** Wenn du 100 To-Dos hast und eines änderst:
- 100 DOM-Elemente werden gelöscht
- 100 neue DOM-Elemente werden erstellt
- 100 Event-Listener werden neu angehängt

Das ist extrem ineffizient. Der Browser muss die komplette Seite neu berechnen.

### Problem 3: State und UI können auseinanderlaufen

```javascript
// Wenn du vergisst renderTodos() aufzurufen:
function quickAddTodo(text) {
    todos.push({ text: text, completed: false });
    // renderTodos(); ← Vergessen!
    saveTodos();
}
// Die Daten sind gespeichert, aber die UI zeigt sie nicht!
```

### Problem 4: Kein Komponenten-System

Wenn du die To-Do-Liste auf einer anderen Seite brauchst, musst du:
- Den HTML-Code kopieren
- Den CSS-Code kopieren  
- Den JavaScript-Code kopieren
- Bei Änderungen BEIDE Stellen aktualisieren

### Problem 5: Globale Variablen und Spaghetti-Code

```javascript
let todos = [];  // Global - jeder kann das ändern
let selectedFilter = 'all';  // Noch eine globale Variable
let sortOrder = 'date';  // Und noch eine...

// Nach 1000 Zeilen Code weißt du nicht mehr,
// welche Funktion welche Variable ändert
```

### Problem 6: Keine TypeScript-Unterstützung

```javascript
function addTodo(text) {
    todos.push({
        id: Date.now(),
        text: text,
        completed: false,
        due_date: dueDate  // Tippfehler! Sollte dueDate sein
    });
}
// JavaScript findet den Fehler NICHT - erst wenn die App abstürzt
```

## 1.3 Die Lösung: Deklarative UI mit React

React dreht das Konzept komplett um. Statt zu sagen "erstelle dieses Element, füge es hier ein", sagst du:

**"So soll die UI aussehen. React, mach es so."**

### Vanilla (Imperativ) vs. React (Deklarativ)

```javascript
// VANILLA - Du sagst WIE es gemacht werden soll (Imperativ)
const li = document.createElement('li');
li.className = todo.completed ? 'todo-item completed' : 'todo-item';
const span = document.createElement('span');
span.textContent = todo.text;
li.appendChild(span);
list.appendChild(li);
```

```jsx
// REACT - Du sagst WAS angezeigt werden soll (Deklarativ)
function TodoItem({ todo }) {
    return (
        <li className={todo.completed ? 'todo-item completed' : 'todo-item'}>
            <span>{todo.text}</span>
        </li>
    );
}
```

**Der Unterschied:**
- **Imperativ:** "Erstelle ein li. Setze die Klasse. Erstelle ein span. Setze den Text. Füge span in li ein. Füge li in list ein."
- **Deklarativ:** "Hier ist ein li mit einem span drin. Der Rest ist dein Problem, React."

---

# Kapitel 2: Die Technologien verstehen

## 2.1 React - Die UI-Bibliothek

### Was React IST

React ist eine JavaScript-Bibliothek (keine vollständige Framework), die drei Dinge macht:

1. **Komponenten:** Teile deine UI in wiederverwendbare Stücke
2. **Virtuelles DOM:** Berechnet die minimalen Änderungen am echten DOM
3. **Reaktiver State:** UI aktualisiert sich automatisch bei Datenänderungen

### Was React NICHT IST

- Kein komplettes Framework (wie Angular)
- Keine Routing-Lösung
- Kein Build-System
- Kein Server

### Das Virtuelle DOM - Wie React so schnell ist

**Schritt 1:** Dein State ändert sich
```javascript
// Vorher: todos = [{ id: 1, text: "Einkaufen" }]
setTodos([...todos, { id: 2, text: "Kochen" }]);
// Nachher: todos = [{ id: 1, text: "Einkaufen" }, { id: 2, text: "Kochen" }]
```

**Schritt 2:** React erstellt einen NEUEN virtuellen DOM-Baum

Das virtuelle DOM ist nur ein JavaScript-Objekt:
```javascript
// Vereinfacht dargestellt:
const virtualDOM = {
    type: 'ul',
    props: { id: 'todo-list' },
    children: [
        { type: 'li', props: { key: 1 }, children: ['Einkaufen'] },
        { type: 'li', props: { key: 2 }, children: ['Kochen'] }  // NEU!
    ]
};
```

**Schritt 3:** React vergleicht alt und neu ("Diffing")

```
ALTER virtueller DOM:         NEUER virtueller DOM:
<ul>                          <ul>
    <li key=1>Einkaufen</li>      <li key=1>Einkaufen</li>  ✓ Gleich
</ul>                             <li key=2>Kochen</li>     ★ NEU!
                              </ul>
```

**Schritt 4:** React wendet NUR die Unterschiede an ("Reconciliation")

```javascript
// React macht intern sowas:
const newLi = document.createElement('li');
newLi.textContent = 'Kochen';
list.appendChild(newLi);  // NUR das neue Element hinzufügen!
```

**Das Ergebnis:**
- Vanilla: 2 DOM-Operationen (alles löschen, alles neu erstellen)
- React: 1 DOM-Operation (nur das neue Element hinzufügen)

Bei 100 To-Dos:
- Vanilla: 200+ DOM-Operationen
- React: 1 DOM-Operation

**DAS ist der Grund, warum React so schnell ist.**

## 2.2 Next.js - Das React-Framework

### Warum React allein nicht reicht

Wenn du nur React benutzt, musst du selbst:
- Routing einrichten (welche URL zeigt welche Seite?)
- Build-Prozess konfigurieren (Webpack, Babel...)
- Server-Side Rendering einrichten
- Code-Splitting machen (nicht alles auf einmal laden)

### Was Next.js hinzufügt

| Feature | Ohne Next.js | Mit Next.js |
|---------|--------------|-------------|
| Routing | `npm install react-router-dom`, manuell konfigurieren | Automatisch durch Dateistruktur |
| Build | Webpack selbst konfigurieren | `npm run build` |
| Server-Side Rendering | Node.js Server selbst aufsetzen | Eingebaut |
| Code-Splitting | Manuell mit `React.lazy()` | Automatisch |
| Entwicklungsserver | Selbst aufsetzen | `npm run dev` |
| API Routes | Separaten Server aufsetzen | Im selben Projekt |

### Der App Router (Next.js 13+)

**Vanilla-Routing:**
```
website/
├── index.html
├── about.html
├── contact.html
└── products.html

Navigation per <a href="about.html">
```

**Next.js App Router:**
```
app/
├── page.tsx          → URL: /
├── about/
│   └── page.tsx      → URL: /about
├── contact/
│   └── page.tsx      → URL: /contact
└── products/
    └── page.tsx      → URL: /products
```

Der **Ordnername** = die **URL**. Keine Konfiguration nötig!

### Server Components vs. Client Components

**Das wichtigste Konzept in Next.js 13+:**

```typescript
// SERVER COMPONENT (Standard - kein 'use client')
// Diese Datei läuft auf dem Server!
export default function Page() {
    // Du könntest hier eine Datenbank abfragen:
    // const users = await db.query('SELECT * FROM users');
    
    return <h1>Hallo Welt</h1>;
}
// Der Browser bekommt NUR das fertige HTML: <h1>Hallo Welt</h1>
// Kein JavaScript wird gesendet!
```

```typescript
// CLIENT COMPONENT
'use client';  // ← Diese Zeile macht den Unterschied!

import { useState } from 'react';

export default function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <button onClick={() => setCount(count + 1)}>
            Klicks: {count}
        </button>
    );
}
// Der Browser bekommt JavaScript, das interaktiv ist
```

**Wann was benutzen?**

| | Server Component | Client Component |
|---|------------------|------------------|
| Interaktivität (onClick, onChange) | ❌ Nicht möglich | ✅ Ja |
| useState, useEffect | ❌ Nicht möglich | ✅ Ja |
| Datenbank-Zugriff | ✅ Direkt möglich | ❌ Nur über API |
| Bundle-Größe | ✅ Klein (nur HTML) | ⚠️ Größer (JS nötig) |
| SEO | ✅ Optimal | ⚠️ Weniger optimal |

**Unsere Blumè-App ist eine Client Component**, weil sie:
- `useState` für State Management braucht
- `onClick` für Buttons braucht
- `localStorage` für Datenspeicherung braucht

## 2.3 TypeScript - JavaScript mit Typen

### Das Problem mit JavaScript

```javascript
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity;
    }
    return total;
}

// Das geht alles - JavaScript beschwert sich nicht:
calculateTotal([{ price: 10, quantity: 2 }]);  // ✓ 20
calculateTotal([{ prce: 10, quantity: 2 }]);   // Bug! Tippfehler bei 'price'
calculateTotal("hello");                        // Bug! String statt Array
calculateTotal(null);                           // Bug! null statt Array
```

JavaScript findet diese Fehler **NICHT**. Du merkst sie erst, wenn die App abstürzt.

### TypeScript findet die Fehler BEVOR du die App startest

```typescript
type CartItem = {
    price: number;
    quantity: number;
};

function calculateTotal(items: CartItem[]): number {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity;
    }
    return total;
}

calculateTotal([{ price: 10, quantity: 2 }]);  // ✓
calculateTotal([{ prce: 10, quantity: 2 }]);   // FEHLER: 'prce' existiert nicht
calculateTotal("hello");                        // FEHLER: String ist kein Array
calculateTotal(null);                           // FEHLER: null ist kein Array
```

### TypeScript-Syntax lernen

#### Grundtypen

```typescript
// String - Text
let name: string = "Max";
let greeting: string = `Hallo ${name}`;  // Template String

// Number - Zahlen (egal ob Ganzzahl oder Dezimal)
let age: number = 25;
let price: number = 19.99;

// Boolean - Wahr oder Falsch
let isActive: boolean = true;
let hasAccess: boolean = false;

// Array - Liste von Werten
let numbers: number[] = [1, 2, 3, 4, 5];
let names: string[] = ["Max", "Anna", "Tom"];

// Alternative Array-Syntax
let moreNumbers: Array<number> = [1, 2, 3];
```

#### Objekte mit Type

```typescript
// Ein Type definiert die Struktur eines Objekts
type User = {
    id: number;
    name: string;
    email: string;
    age?: number;  // ? = optional (muss nicht vorhanden sein)
};

// Jetzt MUSS ein User diese Struktur haben:
const user1: User = {
    id: 1,
    name: "Max",
    email: "max@example.com"
    // age ist optional, kann weggelassen werden
};

const user2: User = {
    id: 2,
    name: "Anna"
    // FEHLER! email fehlt und ist nicht optional
};
```

#### Union Types - Mehrere mögliche Werte

```typescript
// Eine Variable kann mehrere Typen haben
let id: string | number;
id = "abc123";  // ✓ String
id = 123;       // ✓ Number
id = true;      // FEHLER! Boolean nicht erlaubt

// Nützlich für begrenzte Optionen:
type Status = "pending" | "approved" | "rejected";

let orderStatus: Status;
orderStatus = "pending";   // ✓
orderStatus = "approved";  // ✓
orderStatus = "waiting";   // FEHLER! "waiting" ist nicht erlaubt
```

#### Funktionen typisieren

```typescript
// Parameter und Rückgabewert typisieren
function add(a: number, b: number): number {
    return a + b;
}

// Arrow Function mit Typen
const multiply = (a: number, b: number): number => {
    return a * b;
};

// Funktion die nichts zurückgibt
function logMessage(message: string): void {
    console.log(message);
    // void = kein Rückgabewert
}

// Optionale Parameter
function greet(name: string, greeting?: string): string {
    return `${greeting || "Hallo"}, ${name}!`;
}

greet("Max");           // "Hallo, Max!"
greet("Max", "Hi");     // "Hi, Max!"
```

## 2.4 JSX - HTML in JavaScript schreiben

### Was ist JSX?

JSX = **J**ava**S**cript **X**ML

Es erlaubt dir, HTML-ähnliche Syntax direkt in JavaScript zu schreiben.

### Vanilla JavaScript DOM-Manipulation

```javascript
// So erstellst du normalerweise HTML mit JavaScript:
function createTodoItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item';
    
    const span = document.createElement('span');
    span.textContent = todo.text;
    li.appendChild(span);
    
    const button = document.createElement('button');
    button.textContent = 'Löschen';
    button.onclick = () => deleteTodo(todo.id);
    li.appendChild(button);
    
    return li;
}
```

### Mit JSX

```jsx
function TodoItem({ todo, onDelete }) {
    return (
        <li className="todo-item">
            <span>{todo.text}</span>
            <button onClick={() => onDelete(todo.id)}>Löschen</button>
        </li>
    );
}
```

**14 Zeilen Vanilla → 7 Zeilen JSX**

### JSX ist KEIN HTML!

JSX wird von einem Compiler in JavaScript umgewandelt:

```jsx
// Das schreibst du:
<div className="container">
    <h1>Hallo</h1>
</div>

// Das macht der Compiler daraus:
React.createElement(
    'div',
    { className: 'container' },
    React.createElement('h1', null, 'Hallo')
);
```

### Die wichtigsten JSX-Regeln

#### Regel 1: `className` statt `class`

```html
<!-- HTML -->
<div class="container"></div>
```

```jsx
// JSX - 'class' ist ein reserviertes JavaScript-Keyword!
<div className="container"></div>
```

#### Regel 2: `style` ist ein Objekt, keine Strings

```html
<!-- HTML -->
<div style="color: red; font-size: 20px; margin-top: 10px;"></div>
```

```jsx
// JSX - style ist ein JavaScript-Objekt
<div style={{ color: 'red', fontSize: '20px', marginTop: '10px' }}></div>

// Warum doppelte Klammern {{ }}?
// Erste { } = "Hier kommt JavaScript"
// Zweite { } = Das JavaScript-Objekt selbst
```

**Wichtig:** CSS-Properties mit Bindestrich werden zu camelCase:
- `font-size` → `fontSize`
- `margin-top` → `marginTop`
- `background-color` → `backgroundColor`

#### Regel 3: Selbstschließende Tags MÜSSEN / haben

```html
<!-- HTML - beides funktioniert -->
<img src="bild.jpg">
<input type="text">
<br>
```

```jsx
// JSX - MUSS geschlossen werden!
<img src="bild.jpg" />
<input type="text" />
<br />
```

#### Regel 4: Nur EIN Root-Element

```jsx
// FEHLER - Mehrere Root-Elemente
function Component() {
    return (
        <h1>Titel</h1>
        <p>Text</p>
    );
}

// RICHTIG - In ein Element wrappen
function Component() {
    return (
        <div>
            <h1>Titel</h1>
            <p>Text</p>
        </div>
    );
}

// NOCH BESSER - Fragment (kein extra DOM-Element)
function Component() {
    return (
        <>
            <h1>Titel</h1>
            <p>Text</p>
        </>
    );
}
```

### JavaScript in JSX einbetten

Mit **geschweiften Klammern `{}`** kannst du JavaScript-Ausdrücke in JSX einbetten:

```jsx
function UserProfile({ user }) {
    const currentYear = new Date().getFullYear();
    const birthYear = 1995;
    
    return (
        <div>
            {/* Variablen einsetzen */}
            <h1>Hallo, {user.name}!</h1>
            
            {/* Berechnungen */}
            <p>Du bist {currentYear - birthYear} Jahre alt.</p>
            
            {/* Bedingungen (ternärer Operator) */}
            <p>{user.isAdmin ? 'Administrator' : 'Benutzer'}</p>
            
            {/* Funktionsaufrufe */}
            <p>Email: {user.email.toLowerCase()}</p>
            
            {/* Objekt-Properties */}
            <p>ID: {user.id}</p>
        </div>
    );
}
```

### Listen mit map() rendern

**Vanilla JavaScript:**
```javascript
const todos = ['Einkaufen', 'Kochen', 'Putzen'];
const ul = document.createElement('ul');

todos.forEach(todo => {
    const li = document.createElement('li');
    li.textContent = todo;
    ul.appendChild(li);
});

document.body.appendChild(ul);
```

**React mit JSX:**
```jsx
function TodoList() {
    const todos = ['Einkaufen', 'Kochen', 'Putzen'];
    
    return (
        <ul>
            {todos.map((todo, index) => (
                <li key={index}>{todo}</li>
            ))}
        </ul>
    );
}
```

**Wichtig: Das `key` Attribut**

React braucht `key`, um Elemente in Listen eindeutig zu identifizieren:

```jsx
// SCHLECHT - React kann Elemente nicht unterscheiden
{todos.map(todo => (
    <li>{todo}</li>
))}
// Warnung: Each child in a list should have a unique "key" prop.

// AKZEPTABEL - Index als Key (nur wenn Liste sich nie ändert)
{todos.map((todo, index) => (
    <li key={index}>{todo}</li>
))}

// BEST PRACTICE - Eindeutige ID als Key
{todos.map(todo => (
    <li key={todo.id}>{todo.text}</li>
))}
```

**Warum ist `key` so wichtig?**

```
Ohne key - React muss raten:

Vorher: <li>A</li> <li>B</li> <li>C</li>
Nachher: <li>A</li> <li>B</li>

Was wurde entfernt? B? C? React weiß es nicht sicher.

Mit key - React weiß genau was passiert ist:

Vorher: <li key=1>A</li> <li key=2>B</li> <li key=3>C</li>
Nachher: <li key=1>A</li> <li key=2>B</li>

Key 3 fehlt → Element C wurde entfernt.
```

## 2.5 Tailwind CSS - Utility-First CSS

### Was ist Tailwind?

Tailwind ist ein CSS-Framework, das **kleine, wiederverwendbare Klassen** bereitstellt.

### Vanilla CSS vs. Tailwind

**Vanilla CSS:**
```css
/* style.css - Eigene Klassen definieren */
.card {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-title {
    font-size: 24px;
    font-weight: bold;
    color: #222;
    margin-bottom: 10px;
}

.card-text {
    color: #666;
    line-height: 1.5;
}
```

```html
<div class="card">
    <h2 class="card-title">Titel</h2>
    <p class="card-text">Text hier...</p>
</div>
```

**Tailwind CSS:**
```html
<!-- Keine separate CSS-Datei nötig! -->
<div class="max-w-md mx-auto p-5 bg-white rounded-lg shadow-md hover:shadow-lg">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Titel</h2>
    <p class="text-gray-600 leading-relaxed">Text hier...</p>
</div>
```

### Tailwind-Klassen verstehen

Jede Klasse macht EINE Sache:

#### Spacing (Abstände)

```html
<!-- Padding (Innenabstand) -->
<div class="p-4">     <!-- padding: 1rem (16px) auf allen Seiten -->
<div class="px-4">    <!-- padding-left und padding-right: 1rem -->
<div class="py-4">    <!-- padding-top und padding-bottom: 1rem -->
<div class="pt-4">    <!-- padding-top: 1rem -->
<div class="pb-4">    <!-- padding-bottom: 1rem -->
<div class="pl-4">    <!-- padding-left: 1rem -->
<div class="pr-4">    <!-- padding-right: 1rem -->

<!-- Margin (Außenabstand) -->
<div class="m-4">     <!-- margin: 1rem auf allen Seiten -->
<div class="mx-auto"> <!-- margin-left und margin-right: auto (zentriert) -->
<div class="mt-4">    <!-- margin-top: 1rem -->
```

**Die Zahlen:**
| Klasse | Wert |
|--------|------|
| p-0 | 0px |
| p-1 | 0.25rem (4px) |
| p-2 | 0.5rem (8px) |
| p-3 | 0.75rem (12px) |
| p-4 | 1rem (16px) |
| p-5 | 1.25rem (20px) |
| p-6 | 1.5rem (24px) |
| p-8 | 2rem (32px) |
| p-10 | 2.5rem (40px) |
| p-12 | 3rem (48px) |

#### Größen

```html
<!-- Breite -->
<div class="w-full">      <!-- width: 100% -->
<div class="w-1/2">       <!-- width: 50% -->
<div class="w-64">        <!-- width: 16rem (256px) -->
<div class="max-w-md">    <!-- max-width: 28rem (448px) -->

<!-- Höhe -->
<div class="h-screen">    <!-- height: 100vh (volle Bildschirmhöhe) -->
<div class="h-64">        <!-- height: 16rem -->
<div class="min-h-screen"> <!-- min-height: 100vh -->
```

#### Farben

```html
<!-- Hintergrundfarbe -->
<div class="bg-white">      <!-- background-color: white -->
<div class="bg-gray-100">   <!-- helles grau -->
<div class="bg-gray-900">   <!-- fast schwarz -->
<div class="bg-blue-500">   <!-- mittleres blau -->
<div class="bg-red-500">    <!-- rot -->
<div class="bg-[#F0F0F0]">  <!-- eigene Farbe mit [] -->

<!-- Textfarbe -->
<div class="text-white">
<div class="text-gray-600">
<div class="text-[#222222]">  <!-- eigene Farbe -->
```

#### Flexbox und Grid

```html
<!-- Flexbox -->
<div class="flex">                    <!-- display: flex -->
<div class="flex items-center">       <!-- align-items: center -->
<div class="flex justify-between">    <!-- justify-content: space-between -->
<div class="flex flex-col">           <!-- flex-direction: column -->
<div class="flex gap-4">              <!-- gap: 1rem -->

<!-- Grid -->
<div class="grid">                    <!-- display: grid -->
<div class="grid grid-cols-3">        <!-- 3 Spalten -->
<div class="grid grid-cols-2 gap-4">  <!-- 2 Spalten mit Abstand -->
```

#### Responsive Design

**Vanilla CSS:**
```css
.container {
    width: 100%;
}

@media (min-width: 768px) {
    .container {
        width: 80%;
    }
}

@media (min-width: 1024px) {
    .container {
        width: 60%;
    }
}
```

**Tailwind:**
```html
<div class="w-full md:w-4/5 lg:w-3/5">
```

| Präfix | Breakpoint | Bedeutung |
|--------|------------|-----------|
| (kein) | 0px+ | Mobile First (Standard) |
| `sm:` | 640px+ | Kleine Tablets |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Laptops |
| `xl:` | 1280px+ | Desktops |
| `2xl:` | 1536px+ | Große Bildschirme |

#### Hover, Focus und andere Zustände

```html
<!-- Hover -->
<button class="bg-blue-500 hover:bg-blue-600">
    Hover mich
</button>

<!-- Focus -->
<input class="border border-gray-300 focus:border-blue-500 focus:outline-none">

<!-- Active (beim Klicken) -->
<button class="bg-blue-500 active:bg-blue-700">

<!-- Disabled -->
<button class="bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed">
```

#### Transition und Animation

```html
<!-- Sanfte Übergänge -->
<button class="transition-colors duration-300">
    <!-- Farbänderungen dauern 300ms -->
</button>

<div class="transition-all duration-200 ease-out">
    <!-- Alle Änderungen, 200ms, ease-out Kurve -->
</div>
```

### Eigene Werte mit []

Wenn die Standard-Werte nicht passen:

```html
<!-- Eigene Farbe -->
<div class="bg-[#F0F0F0]">
<div class="text-[#222222]">

<!-- Eigene Größe -->
<div class="w-[350px]">
<div class="h-[calc(100vh-80px)]">

<!-- Eigene Schriftgröße -->
<div class="text-[clamp(1rem,2vw,1.5rem)]">
```

### clamp() für flüssige Größen

```html
<h1 class="text-[clamp(1.5rem,4vw,4.5rem)]">
```

**Was macht clamp()?**
```
clamp(MINIMUM, BEVORZUGT, MAXIMUM)
clamp(1.5rem, 4vw, 4.5rem)

- Minimum: Nie kleiner als 1.5rem (24px)
- Bevorzugt: Versucht 4vw zu sein (4% der Viewport-Breite)
- Maximum: Nie größer als 4.5rem (72px)

Bei 500px Viewport: 4vw = 20px → zeigt 24px (Minimum)
Bei 1000px Viewport: 4vw = 40px → zeigt 40px
Bei 2000px Viewport: 4vw = 80px → zeigt 72px (Maximum)
```

---

# TEIL B: DAS PROJEKT AUFSETZEN
## Die Grundstruktur schaffen

---

# Kapitel 3: Das Projekt erstellen

## 3.1 Was passiert bei `npx create-next-app`?

Wenn du ein neues Next.js-Projekt erstellst:

```bash
npx create-next-app@latest blume-webapp
```

Wirst du gefragt:
- TypeScript? → **Yes**
- ESLint? → **Yes**
- Tailwind CSS? → **Yes**
- `src/` directory? → **No** (wir verwenden `app/`)
- App Router? → **Yes**
- Import alias? → **No**

Das erstellt diese Struktur:

```
blume-webapp/
├── app/                    # Hier lebt deine App
│   ├── layout.tsx          # Das Grundgerüst jeder Seite
│   ├── page.tsx            # Die Startseite
│   └── globals.css         # Globale Styles
├── public/                 # Statische Dateien (Bilder, etc.)
├── node_modules/           # Installierte Pakete (nicht anfassen!)
├── package.json            # Projekt-Konfiguration
├── package-lock.json       # Exakte Versions-Locks
├── tsconfig.json           # TypeScript-Konfiguration
├── next.config.ts          # Next.js-Konfiguration
├── tailwind.config.ts      # Tailwind-Konfiguration
└── postcss.config.mjs      # PostCSS-Konfiguration (für Tailwind)
```

## 3.2 Die package.json verstehen

```json
{
  "name": "blume.-webapp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**Zeile für Zeile:**

```json
"name": "blume.-webapp"
```
Der Name deines Projekts. Erscheint in npm wenn du es veröffentlichst.

```json
"version": "0.1.0"
```
Die Version. Folgt dem Schema MAJOR.MINOR.PATCH.

```json
"private": true
```
Verhindert versehentliches Veröffentlichen auf npm.

```json
"scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
}
```
Befehle die du mit `npm run BEFEHL` ausführen kannst:

| Befehl | Was passiert |
|--------|--------------|
| `npm run dev` | Startet den Entwicklungsserver (mit Hot Reload) |
| `npm run build` | Erstellt eine optimierte Produktionsversion |
| `npm run start` | Startet den Produktionsserver |
| `npm run lint` | Prüft deinen Code auf Fehler |

```json
"dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
}
```
Pakete die im Produktionsbetrieb gebraucht werden:
- **next**: Das Next.js Framework
- **react**: Die React-Bibliothek
- **react-dom**: Verbindet React mit dem Browser-DOM

```json
"devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5"
}
```
Pakete nur für die Entwicklung:
- **tailwindcss**: Das CSS-Framework
- **typescript**: Der TypeScript-Compiler
- **@tailwindcss/postcss**: Tailwind-Integration

## 3.3 Das Layout verstehen (layout.tsx)

**Vanilla HTML:**
```html
<!-- Du wiederholst das in JEDER HTML-Datei: -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
    <title>Meine App</title>
</head>
<body>
    <header>Logo</header>
    <main><!-- Seiteninhalt --></main>
    <footer>Copyright</footer>
</body>
</html>
```

**Next.js Layout:**
```typescript
// app/layout.tsx - EINMAL definiert, gilt für ALLE Seiten
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Schriftarten laden
const meineSchrift = localFont({
  src: [
    { path: "./fonts/Chillax-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Chillax-Bold.ttf", weight: "700", style: "normal" },
    // ... weitere Schriftstärken
  ],
  variable: "--font-chillax",  // CSS-Variable erstellen
  display: "swap",             // Text sofort zeigen, Schrift später laden
});

// Metadata für SEO
export const metadata: Metadata = {
  title: "Blumè.",
  description: "Deine To-Do App",
};

// Das Layout selbst
export default function RootLayout({
  children,  // ← Der Seiteninhalt wird hier eingefügt
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${meineSchrift.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Wie es funktioniert:**

```
Browser öffnet /            →  layout.tsx + page.tsx
Browser öffnet /about       →  layout.tsx + about/page.tsx
Browser öffnet /contact     →  layout.tsx + contact/page.tsx

Das Layout UMSCHLIESST jeden Seiteninhalt:

<html>
  <body>
    {children}  ←  Hier wird page.tsx eingefügt
  </body>
</html>
```

## 3.4 Die globalen Styles (globals.css)

```css
/* Tailwind importieren */
@import "tailwindcss";

/* CSS-Variablen definieren */
:root {
  --background: #F0F0F0;
  --foreground: #222222;
  --secondary: #7D7D7D;
  --font-chillax: var(--font-chillax);
}

/* Grundlegende Body-Styles */
body {
  font-family: var(--font-chillax);
  background-color: var(--background);
  color: var(--foreground);
}

/* Box-Sizing für alle Elemente */
* {
  box-sizing: border-box;
}
```

**Was bedeutet das?**

`@import "tailwindcss";`
- Lädt alle Tailwind-Klassen

`:root { --background: #F0F0F0; }`
- `:root` = Das HTML-Element (höchste Ebene)
- `--background` = Eine CSS-Variable
- Verwendung: `var(--background)`

`box-sizing: border-box;`
- **Ohne:** `width: 100px` + `padding: 10px` = 120px Gesamtbreite
- **Mit:** `width: 100px` + `padding: 10px` = 100px Gesamtbreite (Padding wird abgezogen)

---

# TEIL C: DIE APP BAUEN
## Komponente für Komponente

---

# Kapitel 4: Die Hauptseite erstellen (page.tsx)

## 4.1 Die Grundstruktur

Die gesamte Blumè-App ist in EINER Datei: `app/page.tsx`

```typescript
'use client';  // ← WICHTIG! Macht es zu einer Client Component

import { useState, useEffect, useRef } from 'react';

// ... Typ-Definitionen ...

export default function Home() {
  // ... State-Definitionen ...
  // ... Funktionen ...
  
  return (
    <main>
      {/* ... UI ... */}
    </main>
  );
}
```

## 4.2 Warum 'use client'?

**Ohne 'use client':**
```typescript
// SERVER COMPONENT (Standard)
export default function Page() {
  // Das läuft auf dem Server!
  
  // FEHLER: useState ist nur im Browser verfügbar
  const [count, setCount] = useState(0);
  
  return <div>{count}</div>;
}
```

**Mit 'use client':**
```typescript
'use client';

export default function Page() {
  // Das läuft im Browser!
  
  // Funktioniert!
  const [count, setCount] = useState(0);
  
  return <div>{count}</div>;
}
```

**Unsere App braucht 'use client' weil sie:**
- `useState` für State Management verwendet
- `useEffect` für localStorage verwendet
- `onClick` für Buttons verwendet
- `localStorage` für Datenspeicherung verwendet

All das existiert nur im Browser!

## 4.3 Die Typ-Definitionen

```typescript
type Folder = {
  id: string;
  name: string;
  color: string;
};
```

**Was bedeutet das?**

Wir definieren, wie ein "Folder"-Objekt aussehen MUSS:
- Es MUSS eine `id` haben (String)
- Es MUSS einen `name` haben (String)
- Es MUSS eine `color` haben (String)

```typescript
// Das ist ein gültiger Folder:
const folder1: Folder = {
  id: "123",
  name: "Arbeit",
  color: "#FFB6C1"
};

// Das ist KEIN gültiger Folder:
const folder2: Folder = {
  id: "123",
  name: "Arbeit"
  // FEHLER: 'color' fehlt!
};
```

```typescript
type Repeating = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

Ein "Union Type" - die Variable kann NUR einen dieser Werte haben:
```typescript
let repeat: Repeating;
repeat = 'daily';   // ✓
repeat = 'weekly';  // ✓
repeat = 'hourly';  // FEHLER! Nicht im Union Type
```

```typescript
type Todo = {
  id: string;
  text: string;
  folderId?: string;    // ? = optional
  time?: string;
  date: string;
  completed: boolean;
  seriesId?: string;
  repeating?: Repeating;
};
```

**Optionale Properties mit `?`:**
```typescript
// Beide sind gültig:
const todo1: Todo = {
  id: "1",
  text: "Einkaufen",
  date: "2024-02-15",
  completed: false
};

const todo2: Todo = {
  id: "2",
  text: "Meeting",
  folderId: "work-123",  // Optional, aber vorhanden
  time: "14 Uhr",        // Optional, aber vorhanden
  date: "2024-02-15",
  completed: false
};
```

```typescript
type View = 'dashboard' | 'chosen-day' | 'monthly';
```

Die drei möglichen Ansichten der App.

## 4.4 Konstanten

```typescript
const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const months = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];
```

Arrays mit festen Werten, die sich nie ändern. Außerhalb der Komponente definiert, weil:
1. Sie ändern sich nie
2. Sie müssen nicht bei jedem Render neu erstellt werden

---

# Kapitel 5: State Management verstehen

## 5.1 Was ist State?

**Vanilla JavaScript:**
```javascript
// "State" = Daten die sich ändern können
let count = 0;
let todos = [];
let isModalOpen = false;

// Problem: Wenn du count änderst, ändert sich die UI nicht automatisch
count = 5;  // Die Anzeige zeigt immer noch 0!

// Du musst MANUELL die UI aktualisieren:
document.getElementById('counter').textContent = count;
```

**React mit useState:**
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
// Wenn setCount aufgerufen wird, aktualisiert React automatisch die UI!
```

## 5.2 Wie useState funktioniert

```typescript
const [value, setValue] = useState(initialValue);
//     ↑       ↑                    ↑
//     │       │                    └── Anfangswert (wird nur beim ersten Render verwendet)
//     │       └── Funktion zum Ändern des Werts
//     └── Aktueller Wert
```

**Beispiele:**

```typescript
// Boolean State
const [isOpen, setIsOpen] = useState(false);
// isOpen = false
// setIsOpen(true) → isOpen wird true, Komponente rendert neu

// String State
const [name, setName] = useState('');
// name = ''
// setName('Max') → name wird 'Max'

// Number State
const [count, setCount] = useState(0);
// count = 0
// setCount(5) → count wird 5

// Array State
const [todos, setTodos] = useState([]);
// todos = []
// setTodos([{ id: 1, text: 'Test' }]) → todos hat ein Element

// Object State
const [user, setUser] = useState(null);
// user = null
// setUser({ name: 'Max', age: 25 }) → user ist ein Objekt
```

## 5.3 Die goldene Regel: NIEMALS State direkt ändern!

```typescript
const [todos, setTodos] = useState([{ id: 1, text: 'Test' }]);

// ❌ FALSCH - Direkte Mutation
todos.push({ id: 2, text: 'Neu' });
// React weiß nicht, dass sich etwas geändert hat!
// Keine UI-Aktualisierung!

// ✅ RICHTIG - Neues Array erstellen
setTodos([...todos, { id: 2, text: 'Neu' }]);
// React sieht: "Oh, ein neues Array! Ich muss rendern."
```

**Warum?**

React vergleicht Referenzen, nicht Inhalte:
```javascript
const arr1 = [1, 2, 3];
arr1.push(4);
// arr1 ist immer noch dasselbe Array (gleiche Referenz)
// React: "Gleiche Referenz? Nichts hat sich geändert!"

const arr2 = [...arr1, 4];
// arr2 ist ein NEUES Array (neue Referenz)
// React: "Neue Referenz? Ich muss die UI aktualisieren!"
```

## 5.4 Alle States in der Blumè-App

### Ansichts-States

```typescript
const [currentView, setCurrentView] = useState<View>('dashboard');
```
**Zweck:** Welche der drei Ansichten wird angezeigt?
**Mögliche Werte:** `'dashboard'`, `'chosen-day'`, `'monthly'`
**Verwendet in:** View-Navigation, bedingtes Rendering

```typescript
const [selectedDay, setSelectedDay] = useState<Date>(new Date());
```
**Zweck:** Der aktuell im Dashboard ausgewählte Tag
**Typ:** JavaScript Date-Objekt
**Initialwert:** `new Date()` = heute

```typescript
const [chosenDayFromCalendar, setChosenDayFromCalendar] = useState<Date>(new Date());
```
**Zweck:** Der zuletzt in der Monatsübersicht angeklickte Tag
**Warum separat?** Damit der Tag erhalten bleibt, wenn du zwischen Views wechselst

```typescript
const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
```
**Zweck:** Welcher Monat wird in der Monatsübersicht angezeigt?

### Modal-States (Dialoge)

```typescript
const [showFilterModal, setShowFilterModal] = useState(false);
const [showFolderModal, setShowFolderModal] = useState(false);
const [showAddTodoModal, setShowAddTodoModal] = useState(false);
const [showDeleteTodoModal, setShowDeleteTodoModal] = useState(false);
const [showMonthPicker, setShowMonthPicker] = useState(false);
const [showAddFolderFromTodoModal, setShowAddFolderFromTodoModal] = useState(false);
```
**Muster:** Alle sind Boolean - Modal sichtbar (`true`) oder nicht (`false`)

### Formular-States

```typescript
const [newFolderName, setNewFolderName] = useState('');
const [newFolderColor, setNewFolderColor] = useState('#FFB6C1');
const [newTodoText, setNewTodoText] = useState('');
const [newTodoFolder, setNewTodoFolder] = useState('');
const [newTodoTime, setNewTodoTime] = useState('');
const [newTodoRepeating, setNewTodoRepeating] = useState<'' | Repeating>('');
```
**Zweck:** Speichern was der Benutzer in Formularfelder eingibt

```typescript
const [addTodoStep, setAddTodoStep] = useState<1 | 2 | 3 | 4>(1);
```
**Typ:** Kann nur 1, 2, 3 oder 4 sein
**Zweck:** Der aktuelle Schritt im To-Do-Erstellen-Dialog

### Daten-States (Die eigentlichen Inhalte)

```typescript
const [folders, setFolders] = useState<Folder[]>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('blume-folders');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
});
```

**Das ist komplexer - lass uns das aufschlüsseln:**

```typescript
useState<Folder[]>
```
Der Typ ist `Folder[]` = ein Array von Folder-Objekten.

```typescript
useState<Folder[]>(() => { ... })
```
Statt eines direkten Werts übergeben wir eine **Funktion**. Das nennt sich "Lazy Initialization".

**Warum Lazy Initialization?**

```typescript
// OHNE Lazy Initialization:
const [folders, setFolders] = useState(
  JSON.parse(localStorage.getItem('blume-folders') || '[]')
);
// Problem: localStorage.getItem wird bei JEDEM Render aufgerufen!

// MIT Lazy Initialization:
const [folders, setFolders] = useState(() => {
  return JSON.parse(localStorage.getItem('blume-folders') || '[]');
});
// Die Funktion wird nur beim ERSTEN Render aufgerufen!
```

```typescript
if (typeof window !== 'undefined')
```
**Warum diese Prüfung?**

Next.js kann Komponenten auf dem Server rendern. Auf dem Server gibt es kein `window` und kein `localStorage`. Diese Prüfung verhindert Fehler:
- Server: `typeof window === 'undefined'` → gibt `[]` zurück
- Browser: `typeof window === 'object'` → liest localStorage

### Filter-States

```typescript
const [selectedFolderFilters, setSelectedFolderFilters] = useState<string[]>([]);
```
**Typ:** Array von Strings (Ordner-IDs)
**Zweck:** Nach welchen Ordnern wird gefiltert?
**Beispiel:** `['folder-123', 'folder-456']` → zeigt nur To-Dos aus diesen Ordnern

```typescript
const [filterModalCheckedIds, setFilterModalCheckedIds] = useState<Set<string>>(new Set());
```
**Typ:** `Set<string>` - eine Menge von Strings
**Zweck:** Temporärer State für angehakte Checkboxen im Filter-Modal

**Warum Set statt Array?**
```javascript
// Array - Duplikate möglich, langsames .includes()
const arr = ['a', 'b', 'c'];
arr.includes('b');  // O(n) - muss alle durchgehen

// Set - keine Duplikate, schnelles .has()
const set = new Set(['a', 'b', 'c']);
set.has('b');  // O(1) - sofortiger Zugriff
```

### Swipe-States

```typescript
const [todoSwipeOffsets, setTodoSwipeOffsets] = useState<Record<string, number>>({});
```
**Typ:** `Record<string, number>` = Objekt mit String-Keys und Number-Values
**Beispiel:** `{ 'todo-123': -70, 'todo-456': 0 }`
**Zweck:** Wie weit ist jedes To-Do nach links geschoben?

```typescript
const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
const [swipeTodoId, setSwipeTodoId] = useState<string | null>(null);
```
**Zweck:** Tracking der aktuellen Swipe-Geste

### Sonstige States

```typescript
const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
```
**Typ:** Entweder ein Todo-Objekt oder `null`
**Zweck:** Welches To-Do wird gerade bearbeitet?

```typescript
const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
```
**Zweck:** Welches To-Do soll gelöscht werden? (für Bestätigungsdialog)

```typescript
const [isTransitioning, setIsTransitioning] = useState(false);
```
**Zweck:** Läuft gerade eine Übergangs-Animation?

---

# Kapitel 6: useEffect - Seiteneffekte verstehen

## 6.1 Was sind Seiteneffekte?

**"Seiteneffekte"** sind alles, was AUSSERHALB von React passiert:
- Daten in localStorage speichern/laden
- API-Aufrufe machen
- Event Listener hinzufügen
- Timer setzen
- DOM direkt manipulieren

## 6.2 Vanilla vs. React

**Vanilla JavaScript:**
```javascript
// Bei Seitenlade sofort ausführen
const saved = localStorage.getItem('todos');
if (saved) {
    todos = JSON.parse(saved);
    renderTodos();
}

// Event Listener hinzufügen
document.addEventListener('keydown', handleKeyPress);
```

**React mit useEffect:**
```jsx
function App() {
  const [todos, setTodos] = useState([]);
  
  // Wird NACH dem Render ausgeführt
  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      setTodos(JSON.parse(saved));
    }
  }, []); // Leeres Array = nur beim ersten Render
  
  return <div>...</div>;
}
```

## 6.3 Die useEffect-Syntax

```typescript
useEffect(() => {
  // Effekt-Code (wird nach dem Render ausgeführt)
  
  return () => {
    // Cleanup-Code (wird vor dem nächsten Effekt oder beim Unmount ausgeführt)
  };
}, [dependency1, dependency2]); // Dependency Array
```

## 6.4 Das Dependency Array

**Das Dependency Array bestimmt, WANN der Effekt läuft:**

```typescript
// 1. Kein Array: Bei JEDEM Render (fast immer falsch!)
useEffect(() => {
  console.log('Läuft bei jedem Render');
});

// 2. Leeres Array: NUR beim ersten Render (Mount)
useEffect(() => {
  console.log('Läuft nur einmal beim Start');
}, []);

// 3. Mit Dependencies: Beim Mount UND wenn sich eine Dependency ändert
useEffect(() => {
  console.log('Läuft wenn count sich ändert');
}, [count]);

// 4. Mehrere Dependencies: Wenn sich EINE davon ändert
useEffect(() => {
  console.log('Läuft wenn count ODER name sich ändert');
}, [count, name]);
```

## 6.5 useEffect in der Blumè-App

### LocalStorage synchronisieren

```typescript
// Ordner in localStorage speichern
useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('blume-folders', JSON.stringify(folders));
  }
}, [folders]);
```

**Was passiert hier?**

1. `[folders]` = "Führe diesen Effekt aus, wenn sich `folders` ändert"
2. Bei jeder Änderung an `folders`:
   - Prüfe ob wir im Browser sind (`window !== 'undefined'`)
   - Speichere `folders` als JSON-String in localStorage

**Der Ablauf:**
```
Benutzer klickt "Ordner hinzufügen"
          ↓
addFolder() wird aufgerufen
          ↓
setFolders([...folders, newFolder])
          ↓
React rendert die Komponente neu (neuer State)
          ↓
useEffect erkennt: folders hat sich geändert!
          ↓
localStorage.setItem('blume-folders', ...) wird ausgeführt
```

### Document-Level Event Listener

```typescript
useEffect(() => {
  // Wenn kein Swipe aktiv ist, nichts tun
  if (!swipeTodoId) return;

  const onDocMouseMove = (e: MouseEvent) => {
    // Swipe-Logik...
  };

  const onDocMouseUp = () => {
    // Swipe-Ende-Logik...
  };

  // Event Listener hinzufügen
  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('mouseup', onDocMouseUp);
  
  // CLEANUP: Event Listener entfernen!
  return () => {
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('mouseup', onDocMouseUp);
  };
}, [swipeTodoId]);
```

**Warum Cleanup?**

Ohne Cleanup würden bei jedem Render NEUE Event Listener hinzugefügt:
```
Render 1: 1 Listener
Render 2: 2 Listener (alter + neuer)
Render 3: 3 Listener
...
Render 100: 100 Listener! → Memory Leak, Bugs, langsame App
```

**Warum Document-Level?**

Wenn der Benutzer ein To-Do zieht und der Mauszeiger das Element verlässt:
- **Element-Level:** `onMouseMove` auf dem Element feuert nicht mehr
- **Document-Level:** `document.onMouseMove` feuert IMMER (Maus ist immer über dem Document)

---

# Kapitel 7: useRef - Werte ohne Re-Render

## 7.1 Das Problem mit useState für alles

```jsx
function SwipeTracker() {
  const [mouseX, setMouseX] = useState(0);
  
  return (
    <div onMouseMove={(e) => setMouseX(e.clientX)}>
      Position: {mouseX}
    </div>
  );
}
```

**Problem:** Bei 60 FPS (60 Mausbewegungen pro Sekunde):
- 60x `setMouseX` aufgerufen
- 60x Re-Render
- 60x DOM-Updates

Das ist verschwenderisch!

## 7.2 useRef speichert Werte OHNE Re-Render

```jsx
function SwipeTracker() {
  const mouseXRef = useRef(0);
  
  return (
    <div onMouseMove={(e) => {
      mouseXRef.current = e.clientX;  // KEIN Re-Render!
    }}>
      Tracking aktiv...
    </div>
  );
}
```

## 7.3 useRef vs. useState

| | useState | useRef |
|---|----------|--------|
| Änderung triggert Re-Render | ✅ Ja | ❌ Nein |
| Wert bleibt zwischen Renders | ✅ Ja | ✅ Ja |
| Für UI-relevante Daten | ✅ Ja | ❌ Nein |
| Für interne Berechnungen | ❌ Nein | ✅ Ja |

## 7.4 useRef in der Blumè-App

```typescript
const mouseDragRef = useRef<{ todoId: string; startX: number; offset: number } | null>(null);
const didMouseDragRef = useRef(false);
```

**Warum useRef hier?**

Während eines Swipes:
1. 60 mousemove Events pro Sekunde
2. Wir müssen Position tracken
3. Aber die UI muss sich nicht 60x aktualisieren

**Verwendung:**
```typescript
// Swipe startet
mouseDragRef.current = { todoId: '123', startX: 200, offset: 0 };

// Während des Swipes (60x pro Sekunde, KEIN Re-Render)
mouseDragRef.current.startX = e.clientX;
mouseDragRef.current.offset = -50;

// Swipe endet (JETZT Re-Render für finale Position)
setTodoSwipeOffsets(prev => ({ ...prev, ['123']: -140 }));
mouseDragRef.current = null;
```

---

# Kapitel 8: Alle Funktionen erklärt

## 8.1 Datums-Funktionen

### getCurrentWeekdayIndex()

```typescript
const getCurrentWeekdayIndex = () => {
  const dayToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
  const day = dayToUse.getDay();
  return day === 0 ? 6 : day - 1;
};
```

**Schritt für Schritt:**

1. **Welcher Tag soll verwendet werden?**
   ```typescript
   const dayToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
   ```
   - In View 3 (chosen-day): Der aus dem Kalender gewählte Tag
   - Sonst: Der aktuell navigierte Tag

2. **JavaScript-Wochentag holen:**
   ```typescript
   const day = dayToUse.getDay();
   // Sonntag = 0, Montag = 1, ..., Samstag = 6
   ```

3. **Zu deutschem Format konvertieren (Montag = 0):**
   ```typescript
   return day === 0 ? 6 : day - 1;
   // Sonntag (0) → 6
   // Montag (1) → 0
   // Dienstag (2) → 1
   // etc.
   ```

### formatDateString()

```typescript
const formatDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**Beispiel:**
```typescript
formatDateString(new Date(2024, 1, 5));
// year = 2024
// month = "02" (getMonth() gibt 1, +1 = 2, padStart fügt "0" hinzu)
// day = "05" (getDate() gibt 5, padStart fügt "0" hinzu)
// Ergebnis: "2024-02-05"
```

**Warum padStart?**
```typescript
String(5).padStart(2, '0');   // "05"
String(12).padStart(2, '0');  // "12" (schon 2 Zeichen)
```

### getDaysInMonth()

```typescript
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);  // ← Trick!
  const days: Date[] = [];
  
  const current = new Date(firstDay);
  while (current <= lastDay) {
    days.push(new Date(current));  // Kopie erstellen!
    current.setDate(current.getDate() + 1);
  }
  
  return days;
};
```

**Der Trick mit Tag 0:**
```typescript
new Date(2024, 2, 0);
// Monat 2 = März, Tag 0 = Tag VOR dem 1. März = 29. Februar
// Ergebnis: 29. Februar 2024 (Schaltjahr!)

new Date(2024, 3, 0);
// Monat 3 = April, Tag 0 = 31. März
```

**Warum `new Date(current)` statt nur `current`?**
```typescript
// FALSCH:
days.push(current);
// Alle Einträge zeigen auf DAS GLEICHE Objekt!
// Am Ende haben alle denselben Wert.

// RICHTIG:
days.push(new Date(current));
// Jeder Eintrag ist eine unabhängige Kopie.
```

## 8.2 To-Do Abruf-Funktionen

### getTodosForDay()

Diese Funktion ist komplex. Lass uns sie Zeile für Zeile durchgehen:

```typescript
const getTodosForDay = (date: Date) => {
```
Nimmt ein Datum und gibt die To-Dos für diesen Tag zurück.

```typescript
  const dateStr = formatDateString(date);
```
Das Datum als String, z.B. "2024-02-15".

```typescript
  const today = new Date();
  today.setHours(0, 0, 0, 0);
```
"Heute" definieren. `setHours(0, 0, 0, 0)` setzt die Zeit auf Mitternacht.

**Warum Mitternacht?**
```typescript
// Ohne setHours:
const date1 = new Date("2024-02-15T10:30:00");
const date2 = new Date("2024-02-15T18:45:00");
date1.getTime() === date2.getTime();  // false! Unterschiedliche Zeiten

// Mit setHours:
date1.setHours(0, 0, 0, 0);
date2.setHours(0, 0, 0, 0);
date1.getTime() === date2.getTime();  // true! Beide sind jetzt 00:00:00
```

```typescript
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  const isToday = selectedDate.getTime() === today.getTime();
```
Ist das ausgewählte Datum heute?

```typescript
  const filtered = todos.filter(todo => {
```
Filtere die To-Dos. `filter` erstellt ein neues Array mit nur den Elementen, die `true` zurückgeben.

```typescript
    if (selectedFolderFilters.length > 0) {
      const folderId = todo.folderId ?? '';
      if (!selectedFolderFilters.includes(folderId)) return false;
    }
```
**Filter 1: Ordner-Filter**
- Wenn Filter aktiv sind (`length > 0`)
- Und das To-Do nicht in einem gefilterten Ordner ist
- → Rausfiltern (`return false`)

**Was macht `??`?**
```typescript
todo.folderId ?? ''
// Wenn folderId undefined oder null ist, verwende '' (leerer String)
// Sonst verwende folderId
```

```typescript
    const todoDate = new Date(todo.date + 'T00:00:00');
    todoDate.setHours(0, 0, 0, 0);
```
Das Datum des To-Dos als Date-Objekt.

```typescript
    if (isToday && todoDate < today && !todo.completed) {
      return true;
    }
```
**Filter 2: Überfällige To-Dos auf "Heute"**
- Wenn wir "heute" ansehen (`isToday`)
- Und das To-Do in der Vergangenheit liegt (`todoDate < today`)
- Und es noch nicht erledigt ist (`!todo.completed`)
- → Anzeigen (`return true`)

```typescript
    return todo.date === dateStr;
```
**Filter 3: Normaler Datumsfilter**
- Zeige To-Dos deren Datum mit dem ausgewählten übereinstimmt

```typescript
  });

  return [...filtered].sort((a, b) => {
```
Sortiere das gefilterte Array. `[...filtered]` erstellt eine Kopie (sort mutiert das Original!).

```typescript
    const completedDiff = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
    if (completedDiff !== 0) return completedDiff;
```
**Sortierung 1: Unerledigte zuerst**
- `a.completed = false` → 0
- `a.completed = true` → 1
- Differenz negativ → a kommt zuerst
- Differenz positiv → b kommt zuerst

```typescript
    const folderA = a.folderId || '';
    const folderB = b.folderId || '';
    return folderA.localeCompare(folderB);
```
**Sortierung 2: Nach Ordner gruppieren**
- `localeCompare` vergleicht Strings alphabetisch

```typescript
  });
};
```

## 8.3 CRUD-Funktionen

### addFolder()

```typescript
const addFolder = () => {
  if (newFolderName.trim()) {
```
Nur ausführen wenn der Name nicht leer ist. `trim()` entfernt Leerzeichen am Anfang/Ende.

```typescript
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      color: newFolderColor,
    };
```
Ein neues Folder-Objekt erstellen.
- `Date.now()` gibt Millisekunden seit 1970 - praktisch einzigartig
- `toString()` macht es zum String

```typescript
    setFolders([...folders, newFolder]);
```
Neues Array mit allen alten Ordnern + dem neuen.

```typescript
    setNewFolderName('');
    setNewFolderColor('#FFB6C1');
```
Formular zurücksetzen.

```typescript
  }
};
```

### toggleTodoComplete()

```typescript
const toggleTodoComplete = (todoId: string) => {
  if (getSwipeOffset(todoId) < 0) return;
```
Nicht toggeln wenn Swipe-Aktionen offen sind (Offset negativ = nach links geschoben).

```typescript
  setTodos(todos.map(todo => 
    todo.id === todoId 
      ? { ...todo, completed: !todo.completed }
      : todo
  ));
```
**Das map-Pattern verstehen:**

```typescript
todos.map(todo => {
  if (todo.id === todoId) {
    // Das ist das To-Do das wir ändern wollen
    return { ...todo, completed: !todo.completed };
    // Spread: Kopiere alle Properties, überschreibe nur 'completed'
  } else {
    // Andere To-Dos bleiben unverändert
    return todo;
  }
});
```

**Visualisiert:**
```
Vorher: [
  { id: "1", text: "A", completed: false },
  { id: "2", text: "B", completed: false },  ← Diese ändern
  { id: "3", text: "C", completed: false }
]

Nachher: [
  { id: "1", text: "A", completed: false },  ← Unverändert
  { id: "2", text: "B", completed: true },   ← Geändert!
  { id: "3", text: "C", completed: false }   ← Unverändert
]
```

### addTodo()

Diese Funktion ist die komplexeste. Sie behandelt sowohl Erstellen als auch Bearbeiten:

```typescript
const addTodo = () => {
  if (!newTodoText.trim()) return;
```
Abbrechen wenn kein Text eingegeben wurde.

```typescript
  const timeDisplay = newTodoTime 
    ? newTodoTime.split(':')[0] + ' Uhr' 
    : undefined;
```
Zeit formatieren: "14:30" → "14 Uhr"

```typescript
  const folderId = newTodoFolder || undefined;
```
Leerer String → `undefined`

```typescript
  if (editingTodo) {
```
**BEARBEITEN-Modus:**

```typescript
    const updatedTodo: Todo = {
      ...editingTodo,
      text: newTodoText.trim(),
      folderId,
      time: timeDisplay,
    };
```
Spread das alte To-Do, überschreibe die geänderten Felder.

```typescript
    setTodos(todos.map(todo => 
      todo.id === editingTodo.id ? updatedTodo : todo
    ));
    setEditingTodo(null);
```
Ersetze das alte mit dem neuen To-Do.

```typescript
  } else {
```
**ERSTELLEN-Modus:**

```typescript
    const dateToUse = currentView === 'chosen-day' 
      ? chosenDayFromCalendar 
      : selectedDay;
    const repeating = newTodoRepeating || undefined;
    const seriesId = repeating ? `series-${Date.now()}` : undefined;
```

```typescript
    if (repeating) {
      const dates = getDatesForRepeating(dateToUse, repeating);
      const newTodos: Todo[] = dates.map((d, i) => ({
        id: `${seriesId}-${i}`,
        text: newTodoText.trim(),
        folderId,
        time: timeDisplay,
        date: formatDateString(d),
        completed: false,
        seriesId,
        repeating,
      }));
      setTodos([...todos, ...newTodos]);
```
Für Wiederholungen: Erstelle ein To-Do für jedes Datum.

```typescript
    } else {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: newTodoText.trim(),
        folderId,
        time: timeDisplay,
        date: formatDateString(dateToUse),
        completed: false,
      };
      setTodos([...todos, newTodo]);
    }
```
Für einmalige To-Dos: Erstelle nur eines.

```typescript
  }

  // Formular zurücksetzen
  setNewTodoText('');
  setNewTodoFolder('');
  setNewTodoTime('');
  setNewTodoRepeating('');
  setAddTodoStep(1);
  setShowAddTodoModal(false);
};
```

---

# Kapitel 9: Die UI rendern

## 9.1 Die Return-Struktur

```tsx
return (
  <main className="min-h-screen bg-[#F0F0F0] py-6">
    <div className="max-w-md mx-auto px-4">
      
      {/* Header */}
      <div>...</div>
      
      {/* Conditional Rendering der Views */}
      {(currentView === 'dashboard' || currentView === 'chosen-day') && (
        <div>...</div>
      )}
      
      {currentView === 'monthly' && (
        <div>...</div>
      )}
      
      {/* Modals */}
      {showFilterModal && (
        <div>...</div>
      )}
      
    </div>
    
    {/* Styled JSX für Animationen */}
    <style jsx>{`...`}</style>
  </main>
);
```

## 9.2 Conditional Rendering erklärt

**Vanilla JavaScript:**
```javascript
if (isLoggedIn) {
  container.innerHTML = '<p>Willkommen!</p>';
} else {
  container.innerHTML = '<button>Login</button>';
}
```

**React - Methode 1: && Operator**
```jsx
{isLoggedIn && <p>Willkommen!</p>}
// Wenn isLoggedIn true ist, zeige <p>
// Wenn isLoggedIn false ist, zeige nichts
```

**React - Methode 2: Ternärer Operator**
```jsx
{isLoggedIn ? <p>Willkommen!</p> : <button>Login</button>}
// Wenn true, zeige <p>
// Wenn false, zeige <button>
```

**In der Blumè-App:**
```tsx
{(currentView === 'dashboard' || currentView === 'chosen-day') && (
  <div id="dashboard-view">
    {/* Dashboard-Inhalt */}
  </div>
)}

{currentView === 'monthly' && (
  <div id="monthly-view">
    {/* Monatsübersicht-Inhalt */}
  </div>
)}
```

## 9.3 Listen rendern

```tsx
{currentTodos.map((todo, index) => (
  <div
    key={`${displayDay.toISOString()}-${todo.id}`}
    style={{
      animation: `slideUpFromBottom 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`,
    }}
  >
    {/* To-Do Inhalt */}
  </div>
))}
```

**Was passiert hier?**

1. `currentTodos.map()` - Für jedes To-Do in der Liste
2. `(todo, index)` - Das To-Do und sein Index (0, 1, 2, ...)
3. `key={...}` - Eindeutiger Schlüssel für React
4. `style={{ animation: ... }}` - Inline-Style mit Animation
5. `${index * 0.05}s` - Verzögerung: 0s, 0.05s, 0.1s, 0.15s...

## 9.4 Event Handler

**Vanilla JavaScript:**
```javascript
button.onclick = function() {
  doSomething();
};

// oder
button.addEventListener('click', function() {
  doSomething();
});
```

**React:**
```jsx
<button onClick={() => doSomething()}>
  Klick mich
</button>

// Mit Parameter
<button onClick={() => deleteTodo(todo.id)}>
  Löschen
</button>

// Event-Objekt
<input onChange={(e) => setName(e.target.value)} />
```

---

# Kapitel 10: Performance verstehen

## 10.1 Warum ist die App so schnell?

### 1. Das Virtuelle DOM

**Vanilla:** Bei jeder Änderung wird die gesamte Liste neu gerendert.

**React:** Nur die tatsächlich geänderten Elemente werden aktualisiert.

```
100 To-Dos, eines wird hinzugefügt:

Vanilla:
- list.innerHTML = '' (100 Elemente entfernt)
- 101 neue Elemente erstellt
- 101 DOM-Operationen

React:
- Vergleicht virtuelles DOM
- Erkennt: 100 gleich, 1 neu
- 1 DOM-Operation (nur das neue Element)
```

### 2. CSS Hardware-Beschleunigung

```css
#notes-list-inner > div {
  will-change: transform, opacity;
}
```

**Was macht `will-change`?**

Es sagt dem Browser: "Diese Eigenschaften werden sich ändern, bereite dich vor!"

Der Browser:
1. Erstellt einen separaten Layer für das Element
2. Verschiebt die Berechnung auf die GPU
3. Animationen laufen viel flüssiger

### 3. transform statt Layout-Properties

```jsx
// GUT - Nur visuelle Änderung (GPU)
style={{ transform: `translateX(${offset}px)` }}

// SCHLECHT - Triggert Layout-Neuberechnung
style={{ left: `${offset}px` }}
style={{ marginLeft: `${offset}px` }}
```

**Warum?**

`transform` ändert nur die VISUELLE Position. Das Element nimmt immer noch denselben Platz ein.

`left`/`margin` ändern das LAYOUT. Der Browser muss für ALLE Elemente neu berechnen, wo sie sind.

### 4. useRef für Tracking

```typescript
// Während eines Swipes: 60 Events/Sekunde
// Mit useState: 60 Re-Renders/Sekunde (LANGSAM!)
// Mit useRef: 0 Re-Renders während Swipe, 1 am Ende (SCHNELL!)
```

### 5. Lazy Initialization

```typescript
// Die Funktion wird nur beim ERSTEN Render ausgeführt
const [todos, setTodos] = useState(() => {
  return JSON.parse(localStorage.getItem('todos') || '[]');
});
```

### 6. Minimale Abhängigkeiten

```json
"dependencies": {
  "next": "16.1.6",
  "react": "19.2.3",
  "react-dom": "19.2.3"
}
```

Nur 3 Pakete! Keine zusätzlichen Libraries für:
- State Management (kein Redux)
- Animationen (kein Framer Motion)
- HTTP (kein Axios)
- Datums-Handling (kein date-fns)

**Weniger Code = Schnelleres Laden = Bessere Performance**

---

# Kapitel 11: Animationen

## 11.1 CSS Keyframe Animationen

```css
@keyframes slideUpFromBottom {
  0% {
    opacity: 0;
    transform: translateY(80px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Anwendung:**
```jsx
style={{
  animation: `slideUpFromBottom 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`,
}}
```

**Aufschlüsselung:**
| Teil | Bedeutung |
|------|-----------|
| `slideUpFromBottom` | Name der Animation |
| `0.4s` | Dauer |
| `cubic-bezier(0.4, 0, 0.2, 1)` | Easing-Kurve |
| `${index * 0.05}s` | Verzögerung |
| `both` | Animation-Fill-Mode |

## 11.2 Easing-Kurven

```
linear:        ─────────────
ease:          ╱─────────╲
ease-in:       ────────────╱
ease-out:      ╱────────────
ease-in-out:   ───╱────╲───

cubic-bezier(0.4, 0, 0.2, 1) = Material Design "ease-out"
Schneller Start, sanftes Ende
```

## 11.3 Gestaffelte Animationen

```jsx
{todos.map((todo, index) => (
  <div style={{ animation: `... ${index * 0.05}s ...` }}>
```

| Element | Verzögerung |
|---------|-------------|
| 0 | 0.00s |
| 1 | 0.05s |
| 2 | 0.10s |
| 3 | 0.15s |
| ... | ... |

**Effekt:** Elemente erscheinen nacheinander wie ein Wasserfall.

---

# TEIL D: PRAKTISCHE ÜBUNG

---

# Kapitel 12: Multi-Select Löschen implementieren

Du möchtest folgendes Feature bauen:
1. Ein "Auswählen"-Button unter der To-Do-Liste
2. Im Auswahl-Modus können mehrere To-Dos ausgewählt werden
3. Ein "Löschen"-Button entfernt alle ausgewählten To-Dos

## Schritt 1: Neue States hinzufügen

Füge diese States zu den anderen hinzu (nach Zeile ~55):

```typescript
// Multi-Select States
const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
const [selectedTodoIds, setSelectedTodoIds] = useState<Set<string>>(new Set());
```

**Was machen diese States?**
- `isMultiSelectMode`: Sind wir im Auswahl-Modus?
- `selectedTodoIds`: Welche To-Do-IDs sind ausgewählt?

## Schritt 2: Neue Funktionen hinzufügen

Füge diese Funktionen nach den anderen hinzu (nach Zeile ~450):

```typescript
// Multi-Select Modus umschalten
const toggleMultiSelectMode = () => {
  if (isMultiSelectMode) {
    // Modus verlassen → Auswahl zurücksetzen
    setSelectedTodoIds(new Set());
  }
  setIsMultiSelectMode(!isMultiSelectMode);
};

// Ein To-Do auswählen/abwählen
const toggleTodoSelection = (todoId: string) => {
  setSelectedTodoIds(prev => {
    const next = new Set(prev);
    if (next.has(todoId)) {
      next.delete(todoId);  // War ausgewählt → abwählen
    } else {
      next.add(todoId);     // Nicht ausgewählt → auswählen
    }
    return next;
  });
};

// Alle ausgewählten To-Dos löschen
const deleteSelectedTodos = () => {
  if (selectedTodoIds.size === 0) return;
  
  setTodos(todos.filter(todo => !selectedTodoIds.has(todo.id)));
  setSelectedTodoIds(new Set());
  setIsMultiSelectMode(false);
};

// Alle To-Dos auswählen
const selectAllTodos = () => {
  const allIds = new Set(currentTodos.map(todo => todo.id));
  setSelectedTodoIds(allIds);
};

// Alle abwählen
const deselectAllTodos = () => {
  setSelectedTodoIds(new Set());
};
```

## Schritt 3: Button unter der To-Do-Liste hinzufügen

Finde das Ende von `notes-list-container` (ca. Zeile 1313) und füge danach hinzu:

```tsx
{/* Multi-Select Bereich */}
<div className="mt-4 space-y-2">
  {!isMultiSelectMode ? (
    <button
      onClick={toggleMultiSelectMode}
      className="w-full py-3 bg-white rounded-lg text-[#222222] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      Mehrere auswählen
    </button>
  ) : (
    <>
      <div className="flex gap-2">
        <button
          onClick={selectAllTodos}
          className="flex-1 py-2 bg-white rounded-lg text-sm text-[#222222] hover:bg-gray-50"
        >
          Alle auswählen
        </button>
        <button
          onClick={deselectAllTodos}
          className="flex-1 py-2 bg-white rounded-lg text-sm text-[#222222] hover:bg-gray-50"
        >
          Auswahl aufheben
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggleMultiSelectMode}
          className="flex-1 py-3 border-2 border-gray-200 rounded-lg text-[#222222] hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          onClick={deleteSelectedTodos}
          disabled={selectedTodoIds.size === 0}
          className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedTodoIds.size} löschen
        </button>
      </div>
    </>
  )}
</div>
```

## Schritt 4: To-Do-Klick-Verhalten ändern

Finde den onClick-Handler der To-Do-Items (ca. Zeile 1249) und ändere ihn:

```tsx
onClick={() => {
  if (didMouseDragRef.current) {
    didMouseDragRef.current = false;
    return;
  }
  
  // NEU: Im Multi-Select-Modus auswählen statt abhaken
  if (isMultiSelectMode) {
    toggleTodoSelection(todo.id);
    return;
  }
  
  if (!isSwipedOpen) toggleTodoComplete(todo.id);
}}
```

## Schritt 5: Visuelles Feedback hinzufügen

Ändere den className des To-Do-Items für ausgewählte Hervorhebung:

```tsx
className={`relative z-10 rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-all duration-200 ease-out ${
  isOverdueTask ? 'bg-red-50' : 'bg-white'
} ${
  isMultiSelectMode && selectedTodoIds.has(todo.id) 
    ? 'ring-2 ring-[#222222] bg-gray-100' 
    : ''
}`}
```

## Schritt 6: Checkbox im Multi-Select-Modus

Füge VOR dem `todo-circle` eine Checkbox hinzu:

```tsx
{isMultiSelectMode && (
  <div
    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
      selectedTodoIds.has(todo.id)
        ? 'bg-[#222222] border-[#222222]'
        : 'border-gray-300 bg-white'
    }`}
  >
    {selectedTodoIds.has(todo.id) && (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
        <path d="M5 12l5 5L20 7" />
      </svg>
    )}
  </div>
)}
```

## Was du gelernt hast

1. **Neue States für neue Features** - `isMultiSelectMode`, `selectedTodoIds`
2. **Set für eindeutige Sammlungen** - Schnelles `has()` und `delete()`
3. **Conditional Rendering** - Verschiedene UI je nach Modus
4. **Event-Handler erweitern** - Bestehendes Verhalten modifizieren
5. **Dynamische CSS-Klassen** - Visuelles Feedback für Zustände

---

# Zusammenfassung

## Was du jetzt verstehen solltest

### React
- Komponenten sind Funktionen die UI zurückgeben
- State macht Komponenten interaktiv
- `useState` für Daten die sich ändern
- `useEffect` für Seiteneffekte
- `useRef` für Werte ohne Re-Render

### Next.js
- Dateibasiertes Routing (`app/page.tsx` → `/`)
- `'use client'` für interaktive Komponenten
- Layout umschließt alle Seiten

### TypeScript
- Typen verhindern Bugs
- `type` definiert Objekt-Strukturen
- `?` für optionale Properties
- `|` für Union Types

### JSX
- HTML-ähnlich, aber JavaScript
- `className` statt `class`
- `{}` für JavaScript-Ausdrücke
- `map()` für Listen

### Tailwind CSS
- Utility-First: Eine Klasse = Eine CSS-Eigenschaft
- Responsive: `md:`, `lg:`, etc.
- Hover/Focus: `hover:`, `focus:`, etc.

### Performance
- Virtuelles DOM minimiert DOM-Operationen
- `transform` für GPU-beschleunigte Animationen
- `useRef` für Tracking ohne Re-Render

---

**Herzlichen Glückwunsch!**

Du hast jetzt das Wissen, um diese App vollständig zu verstehen. Der beste nächste Schritt ist, den Code zu ändern und zu experimentieren. Viel Erfolg!
