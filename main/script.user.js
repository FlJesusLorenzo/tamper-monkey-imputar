// ==UserScript==
// @name         Imputaciones con OdooRPC - Popup
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  Create timesheet entries directly from GitLab using OdooRPC popup posibilidad de generar la descripción por IA
// @author       Jesús Lorenzo
// @match        https://git.*
// @include      */issues/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=factorlibre.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// @updateURL    https://github.com/FlJesusLorenzo/tamper-monkey-imputar/raw/refs/heads/main/main/script.user.js
// @downloadURL  https://github.com/FlJesusLorenzo/tamper-monkey-imputar/raw/refs/heads/main/main/script.user.js
// ==/UserScript==

(function () {
  "use strict";

  let CONFIG = {
    ODOO_URL: GM_getValue("odoo_url", "https://tu-odoo.example.com"),
    DB_NAME: GM_getValue("db_name", ""),
    GITLAB_DOMAIN: "git.tuempresa.com",
    LANG: "es_ES",
    TIMEZONE: "Europe/Madrid",
    API_KEY: GM_getValue("api_key"),
  };
  function setGlobalConfig(){
    CONFIG.ODOO_URL = GM_getValue("odoo_url", CONFIG.ODOO_URL);
    CONFIG.DB_NAME = GM_getValue("db_name", CONFIG.DB_NAME);
    CONFIG.API_KEY = GM_getValue("api_key", CONFIG.API_KEY);
  }

  async function generateIADescription(element, button) {
    let userAK = CONFIG.API_KEY;
    if (!userAK || userAK === "") {
      showConfigMenu();
      showStatus(
        "Configurar api_key",
        "error",
        document.getElementById("config-status")
      );
      return;
    }
    button.classList.add("cargando");
    button.disabled = true;

    let issue_desc = document.querySelector(
      ".detail-page-description"
    ).textContent;
    let day = document.getElementById("timesheet-date").value;
    let comments = document.getElementById("notes-list").textContent;
    let user = document
      .getElementById("disclosure-6")
      .getElementsByClassName("gl-font-bold")[0].textContent;

    const promptText = `
    # PERSONA
Actúa como un desarrollador de software experto resumiendo tu trabajo del día para un sistema de imputación de horas. Tu comunicación debe ser técnica, concisa y objetiva.

# OBJETIVO
Generar una descripción breve y precisa para una imputación de horas, basándote exclusivamente en la actividad y los comentarios registrados hoy.

# CONTEXTO DE DATOS
*   **day**: El día al que corresponde el trabajo.
*   **user**: El usuario que realizó el trabajo (debes ignorar este dato en la respuesta).
*   **issue_desc**: Descripción general de la tarea. **IMPORTANTE**: Debes ignorar esta información para generar el resumen. Es solo contexto.
*   **comments**: La única fuente de verdad. Contiene los comentarios, commits y cambios de estado realizados por el usuario durante el día.

# REGLAS PARA LA GENERACIÓN
1.  **Exclusividad**: Basa tu respuesta ÚNICAMENTE en la información de comments. IGNORA por completo el contexto de issue_desc.
2.  **Impersonal y Objetivo**: No uses la primera persona ("hice", "revisé", "mi trabajo fue"). No menciones al usuario. Describe la acción de forma directa.
3.  **Brevedad y Claridad**: El resumen debe tener entre 15 y 25 palabras. Debe quedar claro qué se hizo y qué progreso se logró.
4.  **Enfoque en la Acción**: Resume las acciones clave (análisis, desarrollo, corrección, despliegue, reunión, etc.) mencionadas en los comentarios.

# CASO ESPECIAL
*   Si la variable comments está vacía o no contiene información relevante sobre una acción realizada, genera **exactamente** el siguiente mensaje: "No es posible imputar: no se han registrado comentarios ni actividad en la tarea para el día de hoy."

# EJEMPLOS

---
**EJEMPLO 1: Actividad registrada**

*   **issue_desc**: "Corregir un bug visual en el botón de la página de login."
*   **comments**: "10:30 - Inicio de análisis del bug. Se replica en entorno local. 14:15 - Se identifica el problema en la hoja de estilos 'login.css'. Se aplica corrección y se sube a la rama 'fix/login-button'. 16:45 - Pruebas realizadas con éxito."

*   **SALIDA GENERADA IDEAL**:
    "Análisis y replicación de bug visual. Identificación de causa en CSS, aplicación de corrección y subida a la rama 'fix/login-button'."
---
**EJEMPLO 2: Sin actividad registrada**

*   **issue_desc**: "Desarrollar la nueva API de usuarios."
*   **comments**: ""

*   **SALIDA GENERADA IDEAL**:
    "No es posible imputar: no se han registrado comentarios ni actividad en la tarea para el día de hoy."
---

# TAREA A REALIZAR
Genera la descripción para la imputación de horas basándote en los datos que te proporciono a continuación y siguiendo estrictamente todas las reglas y ejemplos.
day: ${day}
user: ${user}
issue_desc: ${issue_desc}
comments: ${comments}
    `;

    console.log("Iniciando petición directa a la API de Gemini...");

    GM_xmlhttpRequest({
      method: "POST",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${userAK}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
      }),
      onload: function (response) {
        button.classList.remove("cargando");
        button.disabled = false;
        if (response.status >= 200 && response.status < 300) {
          try {
            const data = JSON.parse(response.responseText);
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
              console.log("Respuesta recibida:", text);
              element.textContent = text.trim();
            } else {
              console.error(
                "La respuesta de la API no tuvo el formato esperado:",
                data
              );
              alert(
                "Se recibió una respuesta de la API, pero no contenía texto. Revisa la consola."
              );
            }
          } catch (e) {
            console.error("Error al parsear la respuesta JSON:", e);
            alert(
              "No se pudo procesar la respuesta del servidor. Revisa la consola."
            );
          }
        } else {
          console.error(
            "La API devolvió un error:",
            response.status,
            response.responseText
          );
          alert(
            `Error de la API: ${response.status}. Revisa la consola para más detalles.`
          );
        }
      },
      onerror: function (response) {
        button.classList.remove("cargando");
        button.disabled = false;
        console.error("Error de red o de conexión:", response);
        alert(
          "No se pudo conectar con la API de Gemini. Revisa tu conexión a internet o la consola."
        );
      },
    });
  }

  function closeConfigPopup() {
    const overlay = document.querySelector(".config-overlay");
    const popup = document.querySelector(".config-popup");
    if (overlay) overlay.remove();
    if (popup) popup.remove();
  }

  function saveConfig() {
    const newUrl = document.getElementById("timesheet-url").value;
    if (newUrl !== null && newUrl.trim() !== "") {
      GM_setValue("odoo_url", newUrl.replace(/\/$/, ""));
    }

    const newDb = document.getElementById("timesheet-db").value;
    if (newDb !== null && newDb.trim() !== "") {
      GM_setValue("db_name", newDb);
    }

    const newApiKey = document.getElementById("timesheet-api-key").value;
    if (newApiKey !== null && newApiKey.trim() !== "") {
      GM_setValue("api_key", newApiKey);
    }
    showStatus(
      "Configuración actualizada.",
      "success",
      document.getElementById("config-status")
    );
    setGlobalConfig()
    setTimeout(closeConfigPopup, 1000);
  }

  function showConfigMenu() {
    const currentUrl = CONFIG.ODOO_URL;
    const currentDb = CONFIG.DB_NAME;
    const currentApiKey = CONFIG.API_KEY || "";

    const overlay = document.createElement("div");
    overlay.className = "timesheet-overlay config-overlay";

    const popup = document.createElement("div");
    popup.className = "timesheet-popup config-popup";
    popup.id = "config-popup";

    popup.innerHTML = `
                <h3>Config</h3>
                <div class="timesheet-form-group">
                    <label for="timesheet-url">URL:</label>
                    <input type="text" id="timesheet-url" placeholder="https://www.example.com" value="${currentUrl}" /><br />
                    <label for="timesheet-db">Database:</label>
                    <input type="text" id="timesheet-db" value="${currentDb}"/><br />
                    <label for="timesheet-api-key">API_KEY:</label>
                    <input type="text" id="timesheet-api-key" placeholder="AIzaSy....." value="${currentApiKey}" /><br />
                </div>
                <div class="timesheet-buttons">
                    <button class="timesheet-btn timesheet-btn-primary" id="config-submit">✅ Guardar</button>
                    <button class="timesheet-btn timesheet-btn-secondary" id="config-cancel">❌ Cancelar</button>
                </div>
                <div id="config-status"></div>
            `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    document
      .getElementById("config-submit")
      .addEventListener("click", saveConfig);
    document
      .getElementById("config-cancel")
      .addEventListener("click", closeConfigPopup);
  }

  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);

  // Estilos para el popup
  GM_addStyle(`
        .timesheet-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #007bff;
    border-radius: 10px;
    padding: 25px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Poppins, Arial, sans-serif;
    min-width: 400px;
    max-width: 500px;
}

        .timesheet-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        }

        .timesheet-popup h3 {
            margin: 0 0 20px 0;
            color: #333;
            text-align: center;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }

        .timesheet-form-group {
            margin-bottom: 15px;
        }

        .timesheet-form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }

        .timesheet-form-group input,
        .timesheet-form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.3s ease;
        }

        .timesheet-form-group input:focus,
        .timesheet-form-group textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }

        .timesheet-form-group small {
            display: block;
            margin-top: 5px;
            font-style: italic;
        }

        .timesheet-form-group textarea {
            height: 80px;
            resize: vertical;
        }

        .timesheet-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }

        .timesheet-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s;
        }

        .timesheet-btn-primary {
            background-color: #007bff;
            color: white;
        }

        .timesheet-btn-primary:hover {
            background-color: #0056b3;
        }

        .timesheet-btn-secondary {
            background-color: #6c757d;
            color: white;
        }

        .timesheet-btn-info {
            background-color: #7d756c;
            color: white;
        }

        .timesheet-btn-secondary:hover {
            background-color: #545b62;
        }

        .timesheet-btn-info:hover {
            background-color: #625d54;
        }

        .timesheet-loading {
            text-align: center;
            color: #007bff;
            font-style: italic;
        }

        .timesheet-success {
            text-align: center;
            color: #28a745;
            font-weight: bold;
        }

        .timesheet-error {
            text-align: center;
            color: #dc3545;
            font-weight: bold;
        }

        .timesheet-info {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 12px;
            color: #666;
        }

        #ia-button {
          margin: 5px;
          padding: 0px 10px;
          border: none;
          outline: none;
          color: rgb(255, 255, 255);
          background: #111;
          cursor: pointer;
          position: relative;
          z-index: 0;
          border-radius: 10px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }

        #ia-button:before {
          content: "";
          background: linear-gradient(
            45deg,
            #ff0000,
            #ff7300,
            #fffb00,
            #48ff00,
            #00ffd5,
            #002bff,
            #7a00ff,
            #ff00c8,
            #ff0000
          );
          position: absolute;
          top: -2px;
          left: -2px;
          background-size: 400%;
          z-index: -1;
          filter: blur(5px);
          -webkit-filter: blur(5px);
          width: calc(100% + 4px);
          height: calc(100% + 4px);
          animation: glowing-ia-button 20s linear infinite;
          transition: opacity 0.3s ease-in-out;
          border-radius: 10px;
        }
        #ia-button:hover{
          animation: glowing-ia-button 10s linear infinite;
        }
        @keyframes glowing-ia-button {
          0% {
            background-position: 0 0;
          }
          50% {
            background-position: 400% 0;
          }
          100% {
            background-position: 0 0;
          }
        }

        #ia-button:after {
          z-index: -1;
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: #222;
          left: 0;
          top: 0;
          border-radius: 10px;
        }
        #ia-button .spinner {
          display: none;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #333;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: spin 1s linear infinite;
        }
        #ia-button.cargando .texto-original {
          visibility: hidden;
        }

        #ia-button.cargando .spinner {
          display: block;
        }
        @keyframes spin {
          0% {
              transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
              transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        .tab.active {
            background: white;
            color: #333;
            font-weight: 500;
        }
        .form-container {
            width: 100%;
            max-width: 450px;
            overflow: hidden;
        }
        .form-tabs {
            display: flex;
        }
        .tab {
            flex: 1;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
            color: #000;
            background: #FFF;
            border: none;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .tab.active {
            background: #A0A0A0;
            color: #333;
            font-weight: 500;
        }
        .form-content {
            padding: 30px;
        }

        .form-section {
            display: none;
        }

        .form-section.active {
            display: block;
        }
        
        input[type="time"]::-webkit-datetime-edit {
            color: #333;
        }

        input[type="time"]::-webkit-datetime-edit-fields-wrapper {
            background: transparent;
        }

        input[type="time"]::-webkit-datetime-edit-text {
            color: #666;
            padding: 0 0.3em;
        }

        input[type="time"]::-webkit-datetime-edit-month-field,
        input[type="time"]::-webkit-datetime-edit-day-field,
        input[type="time"]::-webkit-datetime-edit-year-field,
        input[type="time"]::-webkit-datetime-edit-hour-field,
        input[type="time"]::-webkit-datetime-edit-minute-field {
            color: #333;
        }

        input[type="time"]::-webkit-calendar-picker-indicator {
            background: transparent;
            bottom: 0;
            color: transparent;
            cursor: pointer;
            height: auto;
            left: 0;
            position: absolute;
            right: 0;
            top: 0;
            width: auto;
        }

        @media (max-width: 480px) {
            .form-content {
                padding: 20px;
            }
            
            body {
                padding: 10px;
            }
        }
        #form-inicio_fin.active{
          display:flex;
        }
    `);

  class OdooRPC {
    constructor() {
      this.url = CONFIG.ODOO_URL;
      this.db = CONFIG.DB_NAME;
      this.sessionId = null;
      this.uid = null;
      this.context = {
        lang: CONFIG.LANG,
        tz: CONFIG.TIMEZONE,
      };
    }

    async authenticate() {
      try {
        const sessionInfo = await this.getSessionInfo();
        if (sessionInfo && sessionInfo.uid) {
          this.uid = sessionInfo.uid;
          this.sessionId = sessionInfo.session_id;
          this.context = { ...this.context, uid: this.uid };
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error en autenticación:", error);
        return false;
      }
    }

    async getSessionInfo() {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: `${this.url}/web/session/get_session_info`,
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {},
            id: Math.floor(Math.random() * 1000000000),
          }),
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              resolve(data.result);
            } catch (error) {
              reject(error);
            }
          },
          onerror: reject,
        });
      });
    }

    async call(model, method, args = [], kwargs = {}) {
      return new Promise((resolve, reject) => {
        const payload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            model: model,
            method: method,
            args: args,
            kwargs: kwargs,
          },
          id: Math.floor(Math.random() * 1000000000),
        };

        GM_xmlhttpRequest({
          method: "POST",
          url: `${this.url}/web/dataset/call_kw/${model}/${method}`,
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify(payload),
          onload: (response) => {
            try {
              console.log("RPC Response:", response.responseText);
              const data = JSON.parse(response.responseText);
              if (data.error) {
                console.error("RPC Error:", data.error);
                reject(new Error(JSON.stringify(data.error)));
              } else {
                resolve(data.result);
              }
            } catch (error) {
              console.error("Parse Error:", error);
              reject(error);
            }
          },
          onerror: (error) => {
            console.error("Request Error:", error);
            reject(error);
          },
        });
      });
    }

    async odooSearch(model, domain = [], limit = 21, fields = ["odoo_id"]) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: `${this.url}/web/dataset/search_read`,
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify({
            id: Math.floor(Math.random() * 1000000000),
            jsonrpc: "2.0",
            method: "call",
            params: {
              context: this.context,
              model: model,
              domain: domain,
              fields: fields,
              limit: limit,
              sort: "",
            },
          }),
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.error) {
                reject(new Error(data.error.message));
              } else {
                resolve(data.result);
              }
            } catch (error) {
              reject(error);
            }
          },
          onerror: reject,
        });
      });
    }

    async createTimesheetEntry(
      projectId,
      taskId,
      description,
      hours,
      date = null,
      datetime = null
    ) {
      const today = date || new Date().toISOString().split("T")[0];
      datetime = datetime || formatDate(today);

      const timesheetData = {
        project_id: projectId,
        name: description,
        unit_amount: parseFloat(hours),
        date: today,
        date_time: datetime,
        datetime: datetime,
        user_id: this.uid,
      };

      if (taskId) {
        timesheetData.task_id = taskId;
      }

      console.log("Creating timesheet with data:", timesheetData);
      return await this.call("account.analytic.line", "create", [
        timesheetData,
      ]);
    }
  }
  let odooRPC = null;

  odooRPC = new OdooRPC();

  window.addEventListener("load", function () {
    const sidebar = document.querySelector(
      '.issuable-sidebar-header div[data-testid="sidebar-todo"]'
    );
    if (sidebar) {
      const button = document.createElement("button");
      button.classList.add(
        "btn",
        "hide-collapsed",
        "btn-default",
        "btn-sm",
        "gl-button"
      );
      const span = document.createElement("span");
      span.innerText = "⏱️ Imputar Horas";
      button.appendChild(span);
      button.addEventListener("click", showTimesheetPopup);
      sidebar.appendChild(button);
    }
  });

  function getIssueInfo() {
    let proyecto = `${document.location.origin}${document
      .querySelector('div[data-testid="nav-item-link-label"')
      .parentElement.getAttribute("href")}`;
    const tarea = window.location.href.split("#")[0];

    const titleElement =
      document.querySelector('h1[data-testid="issue-title-text"]') ||
      document.querySelector(".issue-title-text") ||
      document.querySelector("h1.title");
    const titulo = titleElement
      ? titleElement.textContent.trim()
      : `Issue #${tarea.split("/")[tarea.split("/").length - 1]}`;

    return { proyecto, tarea, titulo };
  }

  function parseTimeToDecimal(timeInput) {
    timeInput = timeInput.trim();

    if (/^\d*\.?\d+$/.test(timeInput)) {
      const decimal = parseFloat(timeInput);
      return decimal > 0 && decimal <= 24 ? decimal : null;
    }

    const timeRegex = /^(\d{1,2}):([0-5]\d)$/;
    const match = timeInput.match(timeRegex);

    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);

      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return hours + minutes / 60;
      }
    }

    return null;
  }

  function formatDecimalToTime(decimal) {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }

  async function showTimesheetPopup() {
    const issueInfo = getIssueInfo();

    const overlay = document.createElement("div");
    overlay.className = "timesheet-overlay";

    const popup = document.createElement("div");
    popup.className = "timesheet-popup";

    popup.innerHTML = `
                <button id="setup-config" class="timesheet-btn timesheet-btn-secondary">⚙️</button><h3>📝 Crear Parte de Horas</h3>
                <div class="timesheet-info">
                    <strong>Proyecto:</strong> ${
                      issueInfo.proyecto.split("/")[
                        issueInfo.proyecto.split("/").length - 1
                      ]
                    }<br>
                    <strong>Tarea:</strong> #${
                      issueInfo.tarea.split("/")[
                        issueInfo.tarea.split("/").length - 1
                      ]
                    }<br>
                    <strong>Título:</strong> ${issueInfo.titulo}
                </div>
                <div class="timesheet-form-group">
                    <div style="display:flex; justify-content: space-between;">
                      <label for="timesheet-description" style="align-content: center">Descripción del trabajo:</label>
                      <button id="ia-button">
                        <span class="texto-original">Generar con IA</span>
                        <span class="spinner"></span>
                      </button>
                    </div>
                    <textarea id="timesheet-description" placeholder="Describe el trabajo realizado...">${
                      issueInfo.titulo
                    }</textarea>
                </div>
                <div class="form-container">
                    <div class="form-tabs">
                        <div class="tab active" id="dedicate-tab">Horas dedicadas</div>
                        <div class="tab" id="start_end-tab">Hora inicio - Hora final</div>
                    </div>
                    
                    <div class="form-content">
                        <div id="horas">
                            <div id="form-total" class="form-section active">
                                <div class="timesheet-form-group">
                                    <label for="timesheet-hours">Tiempo trabajado:</label>
                                    <input type="text" id="timesheet-hours" placeholder="ej: 2:30" pattern="^([0-9]{1,2}:[0-5][0-9])$">
                                    <small style="color: #666; font-size: 11px;">Formato: HH:MM (ej: 02:30)</small>
                                </div>
                            </div>
                            <div id="form-inicio_fin" class="form-section">
                                <div style="display:flex;">
                                  <div class="timesheet-form-group">
                                      <label for="timesheet-start">Hora inicio:</label>
                                      <input type="text" id="timesheet-start" placeholder="ej: 12:00" pattern="^([0-9][0-9]:[0-5][0-9])$">
                                  </div>
                                  <div class="timesheet-form-group">
                                      <label for="timesheet-end">Hora final:</label>
                                      <input type="text" id="timesheet-end" placeholder="ej: 12:30" pattern="^([0-9][0-9]:[0-5][0-9])$">
                                  </div>
                                </div>
                                <small style="color: #666; font-size: 11px;">El ejemplo actual nos generaria un reporte de 30 minutos</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="timesheet-form-group">
                    <label for="timesheet-date">Fecha:</label>
                    <input type="date" id="timesheet-date" value="${
                      new Date().toISOString().split("T")[0]
                    }">
                </div>
                <div class="timesheet-buttons">
                    <button class="timesheet-btn timesheet-btn-primary" id="timesheet-submit">✅ Crear Parte</button>
                    <button class="timesheet-btn timesheet-btn-secondary" id="timesheet-cancel">❌ Cancelar</button>
                    <button href class="timesheet-btn timesheet-btn-info" id="timesheet-odoo"> Ir a Imputaciones en Odoo</button>
                </div>
                <div id="timesheet-status"></div>
            `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    if (CONFIG.ODOO_URL == "" || CONFIG.DB_NAME == "") {
      showConfigMenu();
    }
    const configButton = document.getElementById("setup-config");
    const iaButton = document.getElementById("ia-button");
    const descriptionField = document.getElementById("timesheet-description");
    const hoursField = document.getElementById("timesheet-hours");
    descriptionField.focus();

    iaButton.addEventListener("click", async function () {
      await generateIADescription(descriptionField, this);
    });
    configButton.addEventListener("click", showConfigMenu);
    hoursField.addEventListener("input", function () {
      const value = this.value.trim();
      if (value) {
        const decimal = parseTimeToDecimal(value);
        if (decimal !== null) {
          if (/^\d*\.?\d+$/.test(value)) {
            this.style.borderColor = "#28a745";
            this.title = `= ${formatDecimalToTime(decimal)}`;
          } else {
            this.style.borderColor = "#28a745";
            this.title = `= ${decimal.toFixed(2)} horas`;
          }
        } else {
          this.style.borderColor = "#dc3545";
          this.title = "Formato inválido";
        }
      } else {
        this.style.borderColor = "#ddd";
        this.title = "";
      }
    });

    const dedicateTab = document.getElementById("dedicate-tab");
    const startEndTab = document.getElementById("start_end-tab");
    const formTotal = document.getElementById("form-total");
    const formInicioFin = document.getElementById("form-inicio_fin");

    dedicateTab.addEventListener("click", function () {
      switchTab(dedicateTab, startEndTab, formTotal, formInicioFin);
    });
    startEndTab.addEventListener("click", function () {
      switchTab(startEndTab, dedicateTab, formInicioFin, formTotal);
    });

    document.getElementById("timesheet-description").focus();

    const timeField = document.getElementById("timesheet-hours");
    timeField.addEventListener("input", function () {
      const value = this.value.trim();
      if (value) {
        const decimal = parseTimeToDecimal(value);
        if (decimal !== null) {
          if (/^\d*\.?\d+$/.test(value)) {
            this.style.borderColor = "#28a745";
            this.title = `= ${formatDecimalToTime(decimal)}`;
          } else {
            this.style.borderColor = "#28a745";
            this.title = `= ${decimal.toFixed(2)} horas`;
          }
        } else {
          this.style.borderColor = "#dc3545";
          this.title = "Formato inválido";
        }
      } else {
        this.style.borderColor = "#ddd";
        this.title = "";
      }
    });

    document
      .getElementById("timesheet-cancel")
      .addEventListener("click", closeTimesheetPopup);
    overlay.addEventListener("click", closeTimesheetPopup);
    document.getElementById("timesheet-odoo").addEventListener("click", () => {
      window.open(
        `${CONFIG.ODOO_URL}/web#view_type=list&model=account.analytic.line&action=976`
      );
    });
    document
      .getElementById("timesheet-submit")
      .addEventListener("click", async () => {
        const active = document.querySelectorAll("div.active");
        let description;
        let hours;
        let date;
        if (active[1].id == "form-total") {
          description = document
            .getElementById("timesheet-description")
            .value.trim();

          let timeInput = document
            .getElementById("timesheet-hours")
            .value.trim();
          date = document.getElementById("timesheet-date").value;

          if (!description) {
            showStatus("Por favor, introduce una descripción", "error");
            return;
          }

          if (!timeInput) {
            showStatus("Por favor, introduce el tiempo trabajado", "error");
            return;
          }

          // Convertir tiempo a decimal
          hours = parseTimeToDecimal(timeInput);
          if (hours === null) {
            showStatus(
              "Formato de tiempo inválido. Usa HH:MM (ej: 2:30) o decimal (ej: 2.5)",
              "error"
            );
            return;
          }

          if (hours <= 0 || hours > 24) {
            showStatus("El tiempo debe estar entre 0 y 24 horas", "error");
            return;
          }

          await createTimesheetEntry(issueInfo, description, hours, date);
        } else if (active[1].id == "form-inicio_fin") {
          description = document
            .getElementById("timesheet-description")
            .value.trim();
          const timeStartInput = document
            .getElementById("timesheet-start")
            .value.trim();
          const timeEndInput = document
            .getElementById("timesheet-end")
            .value.trim();
          date = document.getElementById("timesheet-date").value;
          const startHours = parseTimeToDecimal(timeStartInput);
          const endHours = parseTimeToDecimal(timeEndInput);
          hours = endHours - startHours;

          if (!description) {
            showStatus("Por favor, introduce una descripción", "error");
            return;
          }
          if (!timeStartInput) {
            showStatus("Por favor, introduce la hora de Inicio", "error");
            return;
          }
          if (!timeEndInput) {
            showStatus("Por favor, introduce la hora de Fin", "error");
            return;
          }
          if (startHours === null || endHours === null) {
            showStatus(
              "Formato de tiempo inválido. Usa HH:MM (ej: 2:30)",
              "error"
            );
            return;
          }

          if (startHours <= 0 || startHours > 24) {
            showStatus("El tiempo debe estar entre 0 y 24 horas", "error");
            return;
          }
          if (endHours <= 0 || endHours > 24) {
            showStatus("El tiempo debe estar entre 0 y 24 horas", "error");
            return;
          }
          if (hours <= 0) {
            showStatus(
              "La hora de fin debe ser siempre superior a la hora de inicio",
              "error"
            );
            return;
          }

          await createTimesheetEntry(issueInfo, description, hours, date);
        }
      });

    // Cerrar con ESC
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        closeTimesheetPopup();
        document.removeEventListener("keydown", escHandler);
      }
    });
  }

  function closeTimesheetPopup() {
    const overlay = document.querySelector(".timesheet-overlay");
    const popup = document.querySelector(".timesheet-popup");
    if (overlay) overlay.remove();
    if (popup) popup.remove();
  }

  function showStatus(
    message,
    type = "loading",
    element = document.getElementById("timesheet-status")
  ) {
    const statusDiv = element;
    statusDiv.className = `timesheet-${type}`;
    statusDiv.textContent = message;
  }

  function formatDate(date) {
    let datetime = new Date(date).toISOString();
    datetime = datetime.split("T");

    return `${datetime[0]} ${datetime[1].split(".")[0]}`;
  }

  async function createTimesheetEntry(
    issueInfo,
    description,
    hours,
    date,
    datetime
  ) {
    try {
      showStatus("🔄 Conectando con Odoo...", "loading");

      const authenticated = await odooRPC.authenticate();
      if (!authenticated) {
        showStatus(
          "❌ Error de autenticación. ¿Estás logueado en Odoo?",
          "error"
        );
        return;
      }

      showStatus("🔍 Buscando tarea...", "loading");

      const project = await odooRPC.odooSearch("gitlab.project.project", [
        ["project_url", "=", issueInfo.proyecto],
      ]);

      if (!project || project.length === 0) {
        showStatus(
          `❌ No se encontró el projecto ${
            issueInfo.proyecto.split("/")[
              issueInfo.proyecto.split("/").length - 1
            ]
          } o no está sincronizada en odoo`,
          "error"
        );
        return;
      }

      const projectId = project.records[0].odoo_id[0];

      showStatus("🔍 Buscando tarea...", "loading");

      const tasks = await odooRPC.odooSearch("gitlab.project.task", [
        ["gitlab_url", "=", issueInfo.tarea],
      ]);

      if (!tasks || tasks.length === 0) {
        showStatus(
          `⚠️ No se encontró la tarea #${
            issueInfo.tarea.split("/")[issueInfo.tarea.split("/").length - 1]
          }. Creando entrada sin tarea específica...`,
          "loading"
        );
      }
      const taskId = tasks.records[0].odoo_id[0];

      showStatus("💾 Creando parte de horas...", "loading");

      const timesheetId = await odooRPC.createTimesheetEntry(
        projectId,
        taskId,
        description,
        hours,
        date,
        datetime
      );

      if (timesheetId) {
        showStatus(
          `✅ ¡Parte de horas creado exitosamente! (ID: ${timesheetId})`,
          "success"
        );

        setTimeout(() => {
          closeTimesheetPopup();
        }, 3000);
      } else {
        showStatus("❌ Error al crear el parte de horas", "error");
      }
    } catch (error) {
      console.error("Error creando timesheet:", error);
      showStatus(`❌ Error: ${error.message}`, "error");
    }
  }

  function switchTab(activeTab, inactiveTab, activeForm, inactiveForm) {
    activeTab.classList.add("active");
    inactiveTab.classList.remove("active");

    activeForm.classList.add("active");
    inactiveForm.classList.remove("active");
  }
})();
