// ==UserScript==
// @name         Imputaciones con OdooRPC - Popup dev
// @namespace    http://tampermonkey.net/
// @version      2.1.2
// @description  Create timesheet entries directly from GitLab using OdooRPC popup posibilidad de generar la descripción por IA
// @author       Jesús Lorenzo
// @match        https://git.*
// @include      */issues/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=factorlibre.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource ai_prompt https://raw.githubusercontent.com/FlJesusLorenzo/tamper-monkey-imputar/refs/heads/dev/main/prompt-ia.txt
// @resource css https://raw.githubusercontent.com/FlJesusLorenzo/tamper-monkey-imputar/refs/heads/dev/main/style.css
// @require      https://github.com/FlJesusLorenzo/tamper-monkey-imputar/blob/dev/main/utils.js
// @require      https://github.com/FlJesusLorenzo/tampermonkey-odoo-rpc/raw/refs/heads/main/OdooRPC.js
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

    const promptText = `${GM_getResourceText(ai_prompt)}
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
    document.getElementById("setup-config").addEventListener("click",showConfigMenu)
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
    document.getElementById('setup-config').removeEventListener("click",showConfigMenu)
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
    overlay.addEventListener("click", closeConfigPopup)
  }

  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);

  // Estilos para el popup
  GM_addStyle(GM_getResorceText("css"));
  
  let odooRPC = null;
  odooRPC = new OdooRPC(
    CONFIG.ODOO_URL,
    CONFIG.DB,
    {
      lang: CONFIG.LANG,
      tz: CONFIG.TIMEZONE,
    },
  );

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
                <div class="timesheet-form-group" style="overflow: hidden;">
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
                <div id="footer" style="display: flex;align-items: center;justify-content: center;">
                    <a href="https://github.com/FlJesusLorenzo/tamper-monkey-imputar" target="_blank" style="color: black;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/GitHub_Invertocat_Logo.svg/1024px-GitHub_Invertocat_Logo.svg.png" width="20" /> <span>by Jesús Lorenzo</span>
                    </a>
                </div>
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
        if (document.getElementById("config-popup")){
            closeConfigPopup()
            return;
        }
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
})();
