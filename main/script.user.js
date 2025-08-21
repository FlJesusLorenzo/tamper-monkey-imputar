// ==UserScript==
// @name         Imputaciones con OdooRPC - Popup
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Create timesheet entries directly from GitLab using OdooRPC popup
// @author       Jesús Lorenzo
// @match        https://git.factorlibre.com/*/issues/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=factorlibre.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      odoo.factorlibre.com
// @updateURL    https://github.com/FlJesusLorenzo/tamper-monkey-imputar/raw/refs/heads/main/main/script.user.js
// @downloadURL  https://github.com/FlJesusLorenzo/tamper-monkey-imputar/raw/refs/heads/main/main/script.user.js
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        ODOO_URL: GM_getValue('odoo_url', 'https://tu-odoo.example.com'),
        DB_NAME: GM_getValue('db_name', ''),
        GITLAB_DOMAIN: 'git.tuempresa.com',
        LANG: 'es_ES',
        TIMEZONE: 'Europe/Madrid'
    };

    function showInitialSetup() {
        const dbName = CONFIG.DB_NAME;
        const odooUrl = CONFIG.ODOO_URL;
        if (!dbName || dbName === '' || odooUrl.includes('example.com')) {
            const userDb = prompt(`Configuración inicial:\n\nIntroduce el nombre de tu base de datos Odoo:`);
            const userUrl = prompt(`Introduce la URL de tu instancia Odoo:\n(ejemplo: https://mi-empresa.odoo.com)`);
            if (userDb && userUrl) {
                GM_setValue('db_name', userDb);
                GM_setValue('odoo_url', userUrl.replace(/\/$/, ''));
                alert('¡Configuración guardada! El script está listo para usar.');
                location.reload();
                return false;
            } else {
                alert('Configuración cancelada. El script no funcionará hasta que se configure.');
                return false;
            }
        }
        return true;
    }

    if (!showInitialSetup()) {
        return;
    }

    CONFIG.ODOO_URL = GM_getValue('odoo_url', CONFIG.ODOO_URL);
    CONFIG.DB_NAME = GM_getValue('db_name', CONFIG.DB_NAME);

    function showConfigMenu() {
        const currentUrl = GM_getValue('odoo_url', '');
        const currentDb = GM_getValue('db_name', '');

        const newUrl = prompt(`URL actual de Odoo: ${currentUrl}\n\nIntroduce nueva URL (o deja vacío para mantener):`, currentUrl);
        if (newUrl !== null && newUrl.trim() !== '') {
            GM_setValue('odoo_url', newUrl.replace(/\/$/, ''));
        }

        const newDb = prompt(`Base de datos actual: ${currentDb}\n\nIntroduce nueva base de datos (o deja vacío para mantener):`, currentDb);
        if (newDb !== null && newDb.trim() !== '') {
            GM_setValue('db_name', newDb);
        }

        alert('Configuración actualizada. Recarga la página para aplicar cambios.');
    }

    window.resetOdooConfig = function() {
        if (confirm('¿Estás seguro de que quieres resetear la configuración?')) {
            GM_setValue('db_name', '');
            GM_setValue('odoo_url', '');
            alert('Configuración reseteada. Recarga la página para configurar de nuevo.');
        }
    };
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
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
    `);

    class OdooRPC {
        constructor() {
            this.url = CONFIG.ODOO_URL;
            this.db = CONFIG.DB_NAME;
            this.sessionId = null;
            this.uid = null;
            this.context = {
                lang: CONFIG.LANG,
                tz: CONFIG.TIMEZONE
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
                console.error('Error en autenticación:', error);
                return false;
            }
        }

        async getSessionInfo() {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${this.url}/web/session/get_session_info`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'call',
                        params: {},
                        id: Math.floor(Math.random() * 1000000000)
                    }),
                    onload: (response) => {
                        try {
                            const data = JSON.parse(response.responseText);
                            resolve(data.result);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onerror: reject
                });
            });
        }

        async call(model, method, args = [], kwargs = {}) {
            return new Promise((resolve, reject) => {
                const payload = {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: model,
                        method: method,
                        args: args,
                        kwargs: kwargs
                    },
                    id: Math.floor(Math.random() * 1000000000)
                };

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${this.url}/web/dataset/call_kw/${model}/${method}`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify(payload),
                    onload: (response) => {
                        try {
                            console.log('RPC Response:', response.responseText);
                            const data = JSON.parse(response.responseText);
                            if (data.error) {
                                console.error('RPC Error:', data.error);
                                reject(new Error(JSON.stringify(data.error)));
                            } else {
                                resolve(data.result);
                            }
                        } catch (error) {
                            console.error('Parse Error:', error);
                            reject(error);
                        }
                    },
                    onerror: (error) => {
                        console.error('Request Error:', error);
                        reject(error);
                    }
                });
            });
        }

        async nameSearch(model, name, domain = [], limit = 21) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${this.url}/web/dataset/call_kw/${model}/name_search`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'call',
                        params: {
                            args: [],
                            model: model,
                            method: 'name_search',
                            kwargs: {
                                name: name,
                                args: domain,
                                operator: 'ilike',
                                limit: limit,
                                context: this.context
                            }
                        },
                        id: Math.floor(Math.random() * 1000000000)
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
                    onerror: reject
                });
            });
        }

        async createTimesheetEntry(projectId, taskId, description, hours, date = null) {
            const today = date || new Date().toISOString().split('T')[0];

            const timesheetData = {
                project_id: projectId,
                name: description,
                unit_amount: parseFloat(hours),
                date: today,
                user_id: this.uid
            };

            if (taskId) {
                timesheetData.task_id = taskId;
            }

            console.log('Creating timesheet with data:', timesheetData);
            return await this.call('account.analytic.line', 'create', [timesheetData]);
        }
    }
    let odooRPC = null;

    odooRPC = new OdooRPC();

    window.addEventListener('load', function() {
        const sidebar = document.querySelector('.issuable-sidebar-header div[data-testid="sidebar-todo"]');
        if (sidebar) {
            const button = document.createElement('button');
            button.classList.add('btn', 'hide-collapsed', 'btn-default', 'btn-sm', 'gl-button');
            const span = document.createElement('span');
            span.innerText = '⏱️ Imputar Horas';
            button.appendChild(span);
            button.addEventListener('click', showTimesheetPopup);
            sidebar.appendChild(button);
        }
    });

    function getIssueInfo() {
        const url = window.location.href.split("/");
        let proyecto = document.querySelector('div[data-testid="nav-item-link-label"');
        const tarea = url[7].split("#")[0];

        proyecto = proyecto.textContent.trim()
        const titleElement = document.querySelector('h1[data-testid="issue-title-text"]') ||
              document.querySelector('.issue-title-text') ||
              document.querySelector('h1.title');
        const titulo = titleElement ? titleElement.textContent.trim() : `Issue #${tarea}`;

        return { proyecto, tarea, titulo };
    }

    function parseTimeToDecimal(timeInput) {
        timeInput = timeInput.trim();

        if (/^\d*\.?\d+$/.test(timeInput)) {
            const decimal = parseFloat(timeInput);
            return (decimal > 0 && decimal <= 24) ? decimal : null;
        }

        const timeRegex = /^(\d{1,2}):([0-5]\d)$/;
        const match = timeInput.match(timeRegex);

        if (match) {
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);

            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return hours + (minutes / 60);
            }
        }

        return null;
    }

    function formatDecimalToTime(decimal) {
        const hours = Math.floor(decimal);
        const minutes = Math.round((decimal - hours) * 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    async function showTimesheetPopup() {
        const issueInfo = getIssueInfo();

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'timesheet-overlay';

        // Crear popup
        const popup = document.createElement('div');
        popup.className = 'timesheet-popup';

        popup.innerHTML = `
                <button id="setup-config" class="timesheet-config-btn">'⚙️'</button><h3>📝 Crear Parte de Horas</h3>
                <div class="timesheet-info">
                    <strong>Proyecto:</strong> ${issueInfo.proyecto}<br>
                    <strong>Tarea:</strong> #${issueInfo.tarea}<br>
                    <strong>Título:</strong> ${issueInfo.titulo}
                </div>
                <div class="timesheet-form-group">
                    <label for="timesheet-description">Descripción del trabajo:</label>
                    <textarea id="timesheet-description" placeholder="Describe el trabajo realizado...">${issueInfo.titulo}</textarea>
                </div>
                <div class="timesheet-form-group">
                    <label for="timesheet-hours">Tiempo trabajado:</label>
                    <input type="text" id="timesheet-hours" placeholder="ej: 2:30 o 2.5" pattern="^([0-9]{1,2}:[0-5][0-9]|[0-9]*\.?[0-9]+)$">
                    <small style="color: #666; font-size: 11px;">Formato: HH:MM (ej: 2:30) o decimal (ej: 2.5)</small>
                </div>
                <div class="timesheet-form-group">
                    <label for="timesheet-date">Fecha:</label>
                    <input type="date" id="timesheet-date" value="${new Date().toISOString().split('T')[0]}">
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

        const configButton = document.getElementById('setup-config')

        const timeField = document.getElementById('timesheet-description');
        timeField.focus();

        configButton.addEventListener('click', showConfigMenu);
        timeField.addEventListener('input', function() {
            const value = this.value.trim();
            if (value) {
                const decimal = parseTimeToDecimal(value);
                if (decimal !== null) {
                    if (/^\d*\.?\d+$/.test(value)) {
                        this.style.borderColor = '#28a745';
                        this.title = `= ${formatDecimalToTime(decimal)}`;
                    } else {
                        this.style.borderColor = '#28a745';
                        this.title = `= ${decimal.toFixed(2)} horas`;
                    }
                } else {
                    this.style.borderColor = '#dc3545';
                    this.title = 'Formato inválido';
                }
            } else {
                this.style.borderColor = '#ddd';
                this.title = '';
            }
        });

        document.getElementById('timesheet-cancel').addEventListener('click', closeTimesheetPopup);
        overlay.addEventListener('click', closeTimesheetPopup);
        document.getElementById('timesheet-odoo').addEventListener('click', () => {
            window.open("https://odoo.factorlibre.com/web#view_type=list&model=account.analytic.line&action=976")
        });
        document.getElementById('timesheet-submit').addEventListener('click', async () => {
            const description = document.getElementById('timesheet-description').value.trim();
            const timeInput = document.getElementById('timesheet-hours').value.trim();
            const date = document.getElementById('timesheet-date').value;

            if (!description) {
                showStatus('Por favor, introduce una descripción', 'error');
                return;
            }

            if (!timeInput) {
                showStatus('Por favor, introduce el tiempo trabajado', 'error');
                return;
            }

            // Convertir tiempo a decimal
            const hours = parseTimeToDecimal(timeInput);
            if (hours === null) {
                showStatus('Formato de tiempo inválido. Usa HH:MM (ej: 2:30) o decimal (ej: 2.5)', 'error');
                return;
            }

            if (hours <= 0 || hours > 24) {
                showStatus('El tiempo debe estar entre 0 y 24 horas', 'error');
                return;
            }

            await createTimesheetEntry(issueInfo, description, hours, date);
        });

        // Cerrar con ESC
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeTimesheetPopup();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    function closeTimesheetPopup() {
        const overlay = document.querySelector('.timesheet-overlay');
        const popup = document.querySelector('.timesheet-popup');
        if (overlay) overlay.remove();
        if (popup) popup.remove();
    }

    function showStatus(message, type = 'loading') {
        const statusDiv = document.getElementById('timesheet-status');
        statusDiv.className = `timesheet-${type}`;
        statusDiv.textContent = message;
    }

    async function createTimesheetEntry(issueInfo, description, hours, date) {
        try {
            showStatus('🔄 Conectando con Odoo...', 'loading');

            const authenticated = await odooRPC.authenticate();
            if (!authenticated) {
                showStatus('❌ Error de autenticación. ¿Estás logueado en Odoo?', 'error');
                return;
            }

            showStatus('🔍 Buscando proyecto...', 'loading');

            const projects = await odooRPC.nameSearch(
                'project.project',
                issueInfo.proyecto,
                [['allow_timesheets', '=', true]]
            );

            if (!projects || projects.length === 0) {
                showStatus(`❌ No se encontró el proyecto: ${issueInfo.proyecto}`, 'error');
                return;
            }

            const projectId = projects[0][0];
            const projectName = projects[0][1];

            showStatus('🔍 Buscando tarea...', 'loading');

            let taskId = null;
            const tasks = await odooRPC.nameSearch(
                'project.task',
                `#${issueInfo.tarea}`,
                [['project_id', '=', projectId]]
            );

            if (tasks && tasks.length > 0) {
                taskId = tasks[0][0];
            } else {
                const altTasks = await odooRPC.nameSearch(
                    'project.task',
                    issueInfo.tarea,
                    [['project_id', '=', projectId]]
                );

                if (altTasks && altTasks.length > 0) {
                    taskId = altTasks[0][0];
                } else {
                    showStatus(`⚠️ No se encontró la tarea #${issueInfo.tarea}. Creando entrada sin tarea específica...`, 'loading');
                }
            }

            showStatus('💾 Creando parte de horas...', 'loading');

            const timesheetId = await odooRPC.createTimesheetEntry(
                projectId,
                taskId,
                description,
                hours,
                date
            );

            if (timesheetId) {
                showStatus(`✅ ¡Parte de horas creado exitosamente! (ID: ${timesheetId})`, 'success');

                setTimeout(() => {
                    closeTimesheetPopup();
                }, 3000);
            } else {
                showStatus('❌ Error al crear el parte de horas', 'error');
            }

        } catch (error) {
            console.error('Error creando timesheet:', error);
            showStatus(`❌ Error: ${error.message}`, 'error');
        }
    }
})();
