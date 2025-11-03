function interpolate(str, variables) {
  return new Function(...Object.keys(variables), `return \`${str}\`;`)
      (...Object.values(variables));
}

function parseTimeToDecimal(timeInput, timeRegex = false) {
  timeRegex = timeRegex || /^(\d{1,2}):([0-5]\d)$/;
  timeInput = timeInput.trim();

  if (/^\d*\.?\d+$/.test(timeInput)) {
    const decimal = parseFloat(timeInput);
    return decimal > 0 && decimal <= 24 ? decimal : null;
  }

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

function showStatus(
  message,
  type = "loading",
  element = document.getElementById("timesheet-status")
) {
  const statusDiv = element;
  statusDiv.className = `timesheet-${type}`;
  statusDiv.textContent = message;
}

function switchTab(activeTab, inactiveTab, activeForm, inactiveForm) {
  activeTab.classList.add("active");
  inactiveTab.classList.remove("active");

  activeForm.classList.add("active");
  inactiveForm.classList.remove("active");
}

function checkFormat() {
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
  }

async function generateIADescription(api_key, element, button, statusElement = null, prompt_info = {}, ...args) {
  button.classList.add("cargando");
  button.disabled = true;
  element.disabled = true;

  const promptText = interpolate(GM_getResourceText("ai_prompt"), prompt_info);

  console.log("Iniciando petición directa a la API de Gemini...");

  GM_xmlhttpRequest({
    method: "POST",
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${api_key}`,
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
      element.disabled = false;
      
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
            if (statusElement){
              showStatus(
                "Fallo al generar descripción, revisar consola",
                "error",
                document.getElementById("config-status")
              );
            }
          }
        } catch (e) {
          console.error("Error al parsear la respuesta JSON:", e);
          if (statusElement){
            showStatus(
              "Fallo al generar descripción, revisar consola",
              "error",
              document.getElementById("config-status")
            );
          }
        }
      } else {
        console.error(
          "La API devolvió un error:",
          response.status,
          response.responseText
        );
        if (statusElement){
          showStatus(
            "Fallo al generar descripción, revisar consola",
            "error",
            document.getElementById("config-status")
          );
        }
      }
    },
    onerror: function (response) {
      button.classList.remove("cargando");
      button.disabled = false;
      console.error("Error de red o de conexión:", response);
      if (statusElement){
        showStatus(
          "Fallo al generar descripción, revisar consola",
          "error",
          document.getElementById("config-status")
        );
      }
    },
  });
}
