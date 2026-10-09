CREATE DATABASE IF NOT EXISTS visitas_universitarias
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE visitas_universitarias;

CREATE TABLE IF NOT EXISTS programas (
  id_programa INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS tutores (
  id_tutor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150),
  telefono VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS grupos (
  id_grupo INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  cuatrimestre INT NOT NULL,
  generacion VARCHAR(50),
  id_programa INT NOT NULL,
  id_tutor INT NOT NULL,
  FOREIGN KEY (id_programa) REFERENCES programas(id_programa),
  FOREIGN KEY (id_tutor) REFERENCES tutores(id_tutor)
);

CREATE TABLE IF NOT EXISTS alumnos (
  id_alumno INT AUTO_INCREMENT PRIMARY KEY,
  matricula VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150),
  id_grupo INT NOT NULL,
  FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo)
);

CREATE TABLE IF NOT EXISTS unidades_transporte (
  id_unidad INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  direccion VARCHAR(255),
  telefono VARCHAR(20),
  correo VARCHAR(150),
  asientos_disponibles INT NOT NULL
);

CREATE TABLE IF NOT EXISTS visitas (
  id_visita INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,
  objetivo TEXT,
  estado VARCHAR(30) DEFAULT 'Propuesta'
);

CREATE TABLE IF NOT EXISTS visitas_grupos (
  id_visita INT NOT NULL,
  id_grupo INT NOT NULL,
  PRIMARY KEY (id_visita, id_grupo),
  FOREIGN KEY (id_visita) REFERENCES visitas(id_visita),
  FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo)
);

CREATE TABLE IF NOT EXISTS visitas_asistencias (
  id_visita INT NOT NULL,
  id_alumno INT NOT NULL,
  asiste BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_visita, id_alumno),
  FOREIGN KEY (id_visita) REFERENCES visitas(id_visita),
  FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
);

CREATE TABLE IF NOT EXISTS visitas_presenciales (
  id_visita INT PRIMARY KEY,
  fecha DATE,
  hora TIME,
  temas TEXT,
  FOREIGN KEY (id_visita) REFERENCES visitas(id_visita)
);

CREATE TABLE IF NOT EXISTS visitas_transportes (
  id_visita INT NOT NULL,
  id_unidad INT NOT NULL,
  PRIMARY KEY (id_visita, id_unidad),
  FOREIGN KEY (id_visita) REFERENCES visitas_presenciales(id_visita),
  FOREIGN KEY (id_unidad) REFERENCES unidades_transporte(id_unidad)
);

CREATE TABLE IF NOT EXISTS visitas_virtuales (
  id_visita INT PRIMARY KEY,
  fecha_propuesta DATE,
  horario TIME,
  link_recorrido VARCHAR(500),
  FOREIGN KEY (id_visita) REFERENCES visitas(id_visita)
);

INSERT INTO programas (nombre)
SELECT 'Desarrollo de Software Multiplataforma'
WHERE NOT EXISTS (
  SELECT 1 FROM programas WHERE nombre = 'Desarrollo de Software Multiplataforma'
);

INSERT INTO programas (nombre)
SELECT 'Tecnologias de la Informacion'
WHERE NOT EXISTS (
  SELECT 1 FROM programas WHERE nombre = 'Tecnologias de la Informacion'
);

INSERT INTO programas (nombre)
SELECT 'Administración'
WHERE NOT EXISTS (
  SELECT 1 FROM programas WHERE nombre = 'Administración'
);

INSERT INTO tutores (nombre, correo) SELECT 'Maria Gonzalez', 'maria@ejemplo.com'
WHERE NOT EXISTS (SELECT 1 FROM tutores WHERE nombre = 'Maria Gonzalez');
INSERT INTO tutores (nombre, correo) SELECT 'Roberto Sanchez', 'roberto@ejemplo.com'
WHERE NOT EXISTS (SELECT 1 FROM tutores WHERE nombre = 'Roberto Sanchez');
INSERT INTO tutores (nombre, correo) SELECT 'Laura Mendoza', 'laura@ejemplo.com'
WHERE NOT EXISTS (SELECT 1 FROM tutores WHERE nombre = 'Laura Mendoza');
INSERT INTO tutores (nombre, correo) SELECT 'Jorge Herrera', 'jorge@ejemplo.com'
WHERE NOT EXISTS (SELECT 1 FROM tutores WHERE nombre = 'Jorge Herrera');
INSERT INTO tutores (nombre, correo) SELECT 'Patricia Silva', 'patricia@ejemplo.com'
WHERE NOT EXISTS (SELECT 1 FROM tutores WHERE nombre = 'Patricia Silva');

INSERT INTO grupos (nombre, cuatrimestre, generacion, id_programa, id_tutor)
SELECT 'DSM1-A', 1, '2026-2028', p.id_programa, t.id_tutor
FROM programas p JOIN tutores t ON t.nombre = 'Maria Gonzalez'
WHERE p.nombre = 'Desarrollo de Software Multiplataforma'
  AND NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'DSM1-A');
INSERT INTO grupos (nombre, cuatrimestre, generacion, id_programa, id_tutor)
SELECT 'DSM2-A', 2, '2026-2028', p.id_programa, t.id_tutor
FROM programas p JOIN tutores t ON t.nombre = 'Roberto Sanchez'
WHERE p.nombre = 'Desarrollo de Software Multiplataforma'
  AND NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'DSM2-A');
INSERT INTO grupos (nombre, cuatrimestre, generacion, id_programa, id_tutor)
SELECT 'DSM3-A', 3, '2025-2027', p.id_programa, t.id_tutor
FROM programas p JOIN tutores t ON t.nombre = 'Laura Mendoza'
WHERE p.nombre = 'Desarrollo de Software Multiplataforma'
  AND NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'DSM3-A');
INSERT INTO grupos (nombre, cuatrimestre, generacion, id_programa, id_tutor)
SELECT 'TI2-A', 2, '2026-2028', p.id_programa, t.id_tutor
FROM programas p JOIN tutores t ON t.nombre = 'Jorge Herrera'
WHERE p.nombre = 'Tecnologias de la Informacion'
  AND NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'TI2-A');
INSERT INTO grupos (nombre, cuatrimestre, generacion, id_programa, id_tutor)
SELECT 'ADM3-A', 3, '2025-2027', p.id_programa, t.id_tutor
FROM programas p JOIN tutores t ON t.nombre = 'Patricia Silva'
WHERE p.nombre = 'Administración'
  AND NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'ADM3-A');

INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A001', 'Ana López', id_grupo FROM grupos WHERE nombre = 'DSM1-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A001');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A002', 'Carlos Ramírez', id_grupo FROM grupos WHERE nombre = 'DSM1-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A002');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A003', 'Fernanda Torres', id_grupo FROM grupos WHERE nombre = 'DSM1-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A003');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A004', 'Luis Hernández', id_grupo FROM grupos WHERE nombre = 'DSM1-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A004');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A005', 'Sofía Martínez', id_grupo FROM grupos WHERE nombre = 'DSM1-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A005');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A006', 'Valeria Cruz', id_grupo FROM grupos WHERE nombre = 'DSM2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A006');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A007', 'Miguel Ortega', id_grupo FROM grupos WHERE nombre = 'DSM2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A007');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A008', 'Paola Jiménez', id_grupo FROM grupos WHERE nombre = 'DSM2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A008');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A009', 'Emiliano Ruiz', id_grupo FROM grupos WHERE nombre = 'DSM2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A009');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A010', 'Daniela Flores', id_grupo FROM grupos WHERE nombre = 'DSM2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A010');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A011', 'Andrés Vega', id_grupo FROM grupos WHERE nombre = 'DSM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A011');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A012', 'Camila Rojas', id_grupo FROM grupos WHERE nombre = 'DSM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A012');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A013', 'José Castillo', id_grupo FROM grupos WHERE nombre = 'DSM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A013');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A014', 'Regina Morales', id_grupo FROM grupos WHERE nombre = 'DSM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A014');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A015', 'Iván Navarro', id_grupo FROM grupos WHERE nombre = 'DSM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A015');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A016', 'Mariana Díaz', id_grupo FROM grupos WHERE nombre = 'TI2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A016');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A017', 'David Romero', id_grupo FROM grupos WHERE nombre = 'TI2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A017');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A018', 'Lucía Castro', id_grupo FROM grupos WHERE nombre = 'TI2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A018');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A019', 'Hugo Medina', id_grupo FROM grupos WHERE nombre = 'TI2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A019');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A020', 'Elena Vargas', id_grupo FROM grupos WHERE nombre = 'TI2-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A020');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A021', 'Andrea Salinas', id_grupo FROM grupos WHERE nombre = 'ADM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A021');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A022', 'Óscar Reyes', id_grupo FROM grupos WHERE nombre = 'ADM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A022');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A023', 'Natalia Fuentes', id_grupo FROM grupos WHERE nombre = 'ADM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A023');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A024', 'Ricardo León', id_grupo FROM grupos WHERE nombre = 'ADM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A024');
INSERT INTO alumnos (matricula, nombre, id_grupo)
SELECT 'A025', 'Karla Méndez', id_grupo FROM grupos WHERE nombre = 'ADM3-A'
  AND NOT EXISTS (SELECT 1 FROM alumnos WHERE matricula = 'A025');
