const $ = (id) => document.getElementById(id);
const appState = {
  groups: [],
  selected: [],
  attendance: {},
  buses: [{ nombre: "Autobús 01", direccion: "", telefono: "", correo: "", asientos: 40 }],
  connected: false,
  saving: false,
};

function el(tag, props = {}, content = "") {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (key === "textContent") node.textContent = value;
    else node.setAttribute(key, value);
  });
  if (content) node.textContent = content;
  return node;
}

function showMessage(message, kind = "") {
  const target = $("savedMessage");
  target.textContent = message;
  target.className = `hint ${kind}`.trim();
}

function setConnectionStatus(message, connected) {
  const status = $("connectionStatus");
  status.textContent = message;
  status.className = `connection-message ${connected ? "success" : "error"}`;
  $("retryConnection").classList.toggle("hidden", connected);
  appState.connected = connected;
  updateSaveButton();
}

async function loadGroups() {
  setConnectionStatus("Conectando con MySQL...", false);
  $("connectionStatus").className = "connection-message";
  $("retryConnection").classList.add("hidden");

  try {
    const response = await fetch("/api/grupos");
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || "No se pudieron cargar los grupos.");

    appState.groups = data;
    const initial = data.find((group) => group.id === 2) || data[0];
    appState.selected = initial ? [initial.id] : [];
    appState.attendance = {};
    setConnectionStatus(
      data.length ? `Conectado a MySQL · ${data.length} grupos disponibles` : "Conectado a MySQL, pero no hay grupos registrados.",
      true
    );
    renderGroups();
  } catch (error) {
    appState.groups = [];
    appState.selected = [];
    renderGroups();
    setConnectionStatus(error.message || "No se pudo conectar con el servidor.", false);
    $("retryConnection").classList.remove("hidden");
  }
}

function studentKey(groupId, studentId) {
  return `${groupId}-${studentId}`;
}

function renderGroups() {
  const target = $("groupCards");
  target.replaceChildren();

  if (!appState.groups.length) {
    target.append(el("p", { className: "hint" }, "Los grupos aparecerán cuando el servidor y MySQL estén conectados."));
  }

  for (const groupId of appState.selected) {
    const group = appState.groups.find((item) => item.id === groupId);
    if (!group) continue;

    const card = el("div", { className: "group" });
    const head = el("div", { className: "group-head" });
    head.append(el("strong", {}, group.nombre));

    const remove = el("button", { className: "btn outline small", type: "button" }, "Quitar");
    remove.disabled = appState.selected.length === 1;
    remove.addEventListener("click", () => {
      appState.selected = appState.selected.filter((id) => id !== groupId);
      renderGroups();
    });
    head.append(remove);
    card.append(head, el("p", { className: "meta" }, `${group.programa} · Tutor(a): ${group.tutor}`));

    const present = group.alumnos.filter((student) => appState.attendance[studentKey(group.id, student.id_alumno)] === true).length;
    const attendanceTitle = el("div", { className: "attendance-title" });
    attendanceTitle.append(
      el("strong", {}, "Alumnos participantes"),
      el("span", {}, `${present} / ${group.alumnos.length}`)
    );
    card.append(attendanceTitle);

    const grid = el("div", { className: "checkgrid" });
    for (const student of group.alumnos) {
      const key = studentKey(group.id, student.id_alumno);
      const label = el("label");
      const checkbox = el("input", { type: "checkbox" });
      checkbox.checked = appState.attendance[key] === true;
      checkbox.addEventListener("change", () => {
        appState.attendance[key] = checkbox.checked;
        renderGroups();
      });
      label.append(checkbox, document.createTextNode(student.nombre));
      grid.append(label);
    }
    card.append(grid);
    target.append(card);
  }

  const available = appState.groups.filter((group) => !appState.selected.includes(group.id));
  $("addGroup").disabled = !appState.connected || available.length === 0;
  renderSummary();
}

function field(labelText, value, update, type = "text") {
  const box = el("div");
  const label = el("label", {}, labelText);
  const input = el("input", { type });
  input.value = value ?? "";
  input.addEventListener("input", (event) => {
    update(type === "number" ? Number(event.target.value) : event.target.value);
    renderSummary();
  });
  box.append(label, input);
  return box;
}

function renderBuses() {
  const target = $("buses");
  target.replaceChildren();

  appState.buses.forEach((bus, index) => {
    const card = el("div", { className: "bus" });
    const heading = el("div", { className: "group-head" });
    heading.append(el("strong", {}, `Unidad ${index + 1}`));

    const remove = el("button", { className: "btn outline small", type: "button" }, "Quitar");
    remove.addEventListener("click", () => {
      appState.buses.splice(index, 1);
      renderBuses();
    });
    heading.append(remove);
    card.append(heading);

    const row = el("div", { className: "two" });
    row.append(
      field("Nombre / identificación", bus.nombre, (value) => { bus.nombre = value; }),
      field("Asientos disponibles", bus.asientos, (value) => { bus.asientos = Math.max(0, Number(value) || 0); }, "number"),
      field("Dirección", bus.direccion, (value) => { bus.direccion = value; }),
      field("Teléfono", bus.telefono, (value) => { bus.telefono = value; }),
      field("Correo", bus.correo, (value) => { bus.correo = value; }, "email")
    );
    card.append(row);
    target.append(card);
  });

  renderSummary();
}

function buildReport() {
  const groups = appState.selected.map((id) => {
    const group = appState.groups.find((item) => item.id === id);
    return {
      id_grupo: group.id,
      alumnos: group.alumnos.map((student) => ({
        id_alumno: student.id_alumno,
        asiste: appState.attendance[studentKey(group.id, student.id_alumno)] === true,
      })),
    };
  });

  const tipo = $("type").value;
  return {
    grupos: groups,
    tipo,
    objetivo: $("objective").value.trim(),
    estado: $("status").value,
    fecha: $("date").value,
    hora: $("time").value,
    temas: tipo === "Presencial" ? $("topics").value.trim() : null,
    unidades_transporte: tipo === "Presencial"
      ? appState.buses.map((bus) => ({
        nombre: bus.nombre.trim(),
        direccion: bus.direccion.trim(),
        telefono: bus.telefono.trim(),
        correo: bus.correo.trim(),
        asientos_disponibles: Number(bus.asientos) || 0,
      }))
      : [],
    link_recorrido: tipo === "Virtual" ? $("link").value.trim() : null,
  };
}

function renderSummary() {
  const data = buildReport();
  const selectedGroups = appState.selected
    .map((id) => appState.groups.find((group) => group.id === id))
    .filter(Boolean);
  const students = selectedGroups.flatMap((group) => group.alumnos.map((student) => ({
    group,
    student,
    present: appState.attendance[studentKey(group.id, student.id_alumno)] === true,
  })));
  const present = students.filter((student) => student.present).length;
  const capacity = appState.buses.reduce((total, bus) => total + (Number(bus.asientos) || 0), 0);

  $("numGroups").textContent = selectedGroups.length;
  $("numPresent").textContent = present;
  $("numAbsent").textContent = students.length - present;
  $("summaryType").textContent = data.tipo;
  $("summaryStatus").textContent = data.estado;
  $("capacity").textContent = capacity;
  $("remaining").textContent = capacity - present;

  const summaryGroups = $("summaryGroups");
  summaryGroups.replaceChildren();
  selectedGroups.forEach((group) => {
    const count = group.alumnos.filter((student) => appState.attendance[studentKey(group.id, student.id_alumno)] === true).length;
    summaryGroups.append(el("div", { className: "summarygroup" }, `${group.nombre} · ${group.tutor} · ${count} asistentes`));
  });

  const physical = data.tipo === "Presencial";
  $("capacityBox").classList.toggle("hidden", !physical);
  const overCapacity = physical && present > capacity;
  $("warning").classList.toggle("hidden", !overCapacity);
  $("warning").textContent = overCapacity ? `Faltan ${present - capacity} asientos para los alumnos seleccionados.` : "";
  updateSaveButton();
}

function updateSaveButton() {
  const present = appState.selected.reduce((total, groupId) => {
    const group = appState.groups.find((item) => item.id === groupId);
    return total + (group?.alumnos.filter((student) => appState.attendance[studentKey(group.id, student.id_alumno)] === true).length || 0);
  }, 0);
  const capacity = appState.buses.reduce((total, bus) => total + (Number(bus.asientos) || 0), 0);
  const overCapacity = $("type").value === "Presencial" && present > capacity;
  $("save").disabled = !appState.connected || appState.saving || appState.selected.length === 0 || overCapacity;
}

async function saveVisit() {
  if (!appState.connected || appState.saving) return;
  appState.saving = true;
  $("save").textContent = "Guardando...";
  updateSaveButton();
  showMessage("Guardando la visita en MySQL...");

  try {
    const response = await fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReport()),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.mensaje || "No se pudo guardar la visita.");
    showMessage(`Visita ${result.id_visita} guardada correctamente en MySQL.`, "success");
  } catch (error) {
    showMessage(error.message || "No se pudo guardar la visita en MySQL.", "error");
  } finally {
    appState.saving = false;
    $("save").textContent = "Guardar visita en MySQL";
    updateSaveButton();
  }
}

function downloadReport() {
  const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reporte_visita.json";
  link.click();
  URL.revokeObjectURL(url);
}

$("addGroup").addEventListener("click", () => {
  const options = appState.groups.filter((group) => !appState.selected.includes(group.id));
  const select = $("groupSelect");
  select.replaceChildren();
  options.forEach((group) => select.append(el("option", { value: group.id }, `${group.nombre} · ${group.programa}`)));
  $("groupPicker").classList.toggle("hidden", options.length === 0);
});

$("confirmGroup").addEventListener("click", () => {
  const id = Number($("groupSelect").value);
  if (id && !appState.selected.includes(id)) appState.selected.push(id);
  $("groupPicker").classList.add("hidden");
  renderGroups();
});

$("addBus").addEventListener("click", () => {
  appState.buses.push({ nombre: "", direccion: "", telefono: "", correo: "", asientos: 40 });
  renderBuses();
});

$("type").addEventListener("change", () => {
  const virtual = $("type").value === "Virtual";
  $("physical").classList.toggle("hidden", virtual);
  $("virtual").classList.toggle("hidden", !virtual);
  renderSummary();
});

["objective", "status", "date", "time", "topics", "link"].forEach((id) => {
  $(id).addEventListener("input", renderSummary);
  $(id).addEventListener("change", renderSummary);
});

$("save").addEventListener("click", saveVisit);
$("download").addEventListener("click", downloadReport);
$("retryConnection").addEventListener("click", loadGroups);

renderBuses();
loadGroups();
