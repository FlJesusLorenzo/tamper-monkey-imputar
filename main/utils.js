function interpolate(str, variables) {
  return new Function(...Object.keys(variables), `return \`${str}\`;`)
      (...Object.values(variables));
}

function parseTimeToDecimal(timeInput, timeRegex = false) {
  const timeRegex = timeRegex || /^(\d{1,2}):([0-5]\d)$/;
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
