import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';

export default function GenerarPDF({ id }) {
  const [caracterizacionData, setCaracterizacionData] = useState({});
  const [datosTab, setDatosTab] = useState({});
  const [diagnosticoData, setDiagnosticoData] = useState([]);
  const [activosData, setActivosData] = useState([]);
  const [caracteristicasData, setCaracteristicasData] = useState([]);
  const [relatedData, setRelatedData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.error("El ID del registro de caracterización no está definido.");
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Obtener datos de `inscription_caracterizacion`
        const caracterizacionResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/inscription_caracterizacion/record/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCaracterizacionData(caracterizacionResponse.data.record);

        // Obtener datos relacionados para claves foráneas
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/inscription_caracterizacion/related-data`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRelatedData(fieldsResponse.data.relatedData || {});

        // Obtener datos de `pi_datos` para el caracterizacion_id
        const datosResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_datos/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (datosResponse.data.length > 0) {
          setDatosTab(datosResponse.data[0]);
        }

        // Obtener datos de `pi_diagnostico`
        const diagnosticoResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_diagnostico/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDiagnosticoData(diagnosticoResponse.data);

        // Obtener datos de `pi_activos`
        const activosResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_activos/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setActivosData(activosResponse.data);

        // Obtener datos de `pi_caracteristicas`
        const caracteristicasResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_caracteristicas/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCaracteristicasData(caracteristicasResponse.data);

        setLoading(false);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getColumnDisplayValue = (column, value) => {
    if (relatedData[column]) {
      const relatedRecord = relatedData[column].find(
        (item) => String(item.id) === String(value)
      );
      return relatedRecord ? relatedRecord.displayValue : `ID: ${value}`;
    }
    return value;
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    let yPosition = 100;

    // Encabezado
    doc.setFillColor(200, 200, 200);
    doc.rect(40, 40, 515, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("ESPACIO PARA HEADER", 250, 58, { align: 'center' });

    // Información del emprendimiento
    doc.setFontSize(12);
    doc.text("Información del Emprendimiento", 40, yPosition);

    doc.setFontSize(10);
    const nombreComercial = caracterizacionData["Nombre comercial"] || 'No disponible';
    const localidadNombre = getColumnDisplayValue("Localidad unidad RIC", caracterizacionData["Localidad unidad RIC"]);
    const barrioNombre = getColumnDisplayValue("Barrio de residencia", caracterizacionData["Barrio de residencia"]);
    const direccion = caracterizacionData["Direccion unidad RIC"] || 'No disponible';
    const numeroContacto = caracterizacionData["Numero movil 1 ciudadano"] || 'No disponible';

    doc.text(`Nombre comercial: ${nombreComercial}`, 40, yPosition += 20);
    doc.text(`Localidad: ${localidadNombre || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Barrio: ${barrioNombre || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Dirección: ${direccion}`, 40, yPosition += 15);
    doc.text(`Número de contacto: ${numeroContacto}`, 40, yPosition += 15);

    // Información del emprendedor
    doc.setFontSize(12);
    doc.text("Información del Emprendedor", 40, yPosition += 30);

    doc.setFontSize(10);
    const nombreEmprendedor = [
      caracterizacionData["Primer nombre"] || '',
      caracterizacionData["Otros nombres"] || '',
      caracterizacionData["Primer apellido"] || '',
      caracterizacionData["Segundo apellido"] || ''
    ].filter(Boolean).join(' ');

    const tipoDocumento = getColumnDisplayValue("Tipo de documento", caracterizacionData["Tipo de documento"]);
    const numeroDocumento = caracterizacionData["Numero de documento de identificacion ciudadano"] || 'No disponible';

    doc.text(`Nombre emprendedor: ${nombreEmprendedor || 'No disponible'}`, 40, yPosition += 20);
    doc.text(`Tipo documento identidad: ${tipoDocumento || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Número documento identidad: ${numeroDocumento}`, 40, yPosition += 15);

    // Plan de Inversión
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition += 30, 515, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("PLAN DE INVERSIÓN", 250, yPosition + 15, { align: 'center' });

    // Datos de pi_datos
    doc.setFontSize(10);
    yPosition += 40;
    doc.text(`Tiempo dedicación: ${datosTab["Tiempo de dedicacion al negocio (Parcial o Completo)"] || 'No disponible'}`, 40, yPosition);
    doc.text(`Descripción general del negocio: ${datosTab["Descripcion general del negocio"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Descripción del lugar donde desarrolla la actividad: ${datosTab["Descripcion de el lugar donde desarrolla la actividad"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Descripción de los activos del negocio: ${datosTab["Descripcion de los activos del negocio"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Valor aproximado de los activos del negocio: ${datosTab["Valor aproximado de los activos del negocio"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Total costos fijos mensuales: ${datosTab["Total costos fijos mensuales"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Total costos variables: ${datosTab["Total costos variables"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Total gastos mensuales: ${datosTab["Total gastos mensuales"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Total ventas mensuales del negocio: ${datosTab["Total ventas mensuales del negocio"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Descripción de la capacidad de producción: ${datosTab["Descripcion de la capacidad de produccion"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Valor de los gastos familiares mensuales promedio: ${datosTab["Valor de los gastos familiares mensuales promedio"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Lleva registros separados de finanzas personales y del negocio: ${datosTab["Lleva registros separados de finanzas personales y del negocio"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Usa billeteras móviles: ${datosTab["Usa billeteras moviles"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Cuál: ${datosTab["Cual"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Concepto y justificación del valor de la capitalización: ${datosTab["Concepto y justificacion del valor de la capitalizacion"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Cómo contribuirá la inversión a la mejora productiva del negocio: ${datosTab["Como contribuira la inversion a la mejora productiva del negoci"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`El negocio es sujeto de participación en espacios de conexión: ${datosTab["El negocio es sujeto de participacion en espacios de conexion"] || 'No disponible'}`, 40, yPosition += 15);
    doc.text(`Recomendaciones técnicas, administrativas y financieras: ${datosTab["Recomendaciones tecnica, administrativas y financieras"] || 'No disponible'}`, 40, yPosition += 15);

    // DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA
    yPosition += 30;
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 20, 'F');
    doc.text("DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA", 250, yPosition + 15, { align: 'center' });

    yPosition += 30;

    // Preparar datos para la tabla de Diagnóstico
    const diagnosticoTableData = diagnosticoData.map((item, index) => ({
      index: index + 1,
      area: item["Area de fortalecimiento"] || 'No disponible',
      descripcion: item["Descripcion del area critica por area de fortalecimiento"] || 'No disponible',
      propuesta: item["Propuesta de mejora"] || 'No disponible',
    }));

    // Definir columnas para la tabla de Diagnóstico
    const diagnosticoColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Área de Fortalecimiento', dataKey: 'area' },
      { header: 'Descripción', dataKey: 'descripcion' },
      { header: 'Propuesta de Mejora', dataKey: 'propuesta' },
    ];

    // Agregar la tabla de Diagnóstico
    doc.autoTable({
      startY: yPosition,
      head: [diagnosticoColumns.map(col => col.header)],
      body: diagnosticoTableData.map(row => diagnosticoColumns.map(col => row[col.dataKey])),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // DESCRIPCIÓN ACTIVOS ACTUALES
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 20, 'F');
    doc.text("DESCRIPCIÓN ACTIVOS ACTUALES", 250, yPosition + 15, { align: 'center' });

    yPosition += 30;

    // Preparar datos para la tabla de Activos
    const activosTableData = activosData.map((item, index) => ({
      index: index + 1,
      equipo: item["Equipo"] || 'No disponible',
      descripcion: item["Descripcion"] || 'No disponible',
      vidaUtil: item["Vida util"] || 'No disponible',
      frecuenciaUso: item["Frecuencia de uso (media alta, baja)"] || 'No disponible',
      elementoReposicion: item["Elemento para reposicion (SI NO)"] || 'No disponible',
    }));

    // Definir columnas para la tabla de Activos
    const activosColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Equipo', dataKey: 'equipo' },
      { header: 'Descripción', dataKey: 'descripcion' },
      { header: 'Vida Útil', dataKey: 'vidaUtil' },
      { header: 'Frecuencia de Uso', dataKey: 'frecuenciaUso' },
      { header: 'Elemento para Reposición', dataKey: 'elementoReposicion' },
    ];

    // Agregar la tabla de Activos
    doc.autoTable({
      startY: yPosition,
      head: [activosColumns.map(col => col.header)],
      body: activosTableData.map(row => activosColumns.map(col => row[col.dataKey])),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 20, 'F');
    doc.text("DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO DISPONIBLE PARA LA INSTALACIÓN Y/O UTILIZACIÓN DEL (LOS) BIEN(ES) DE INVERSIÓN", 250, yPosition + 15, { align: 'center' });

    yPosition += 30;

    // Preparar datos para la tabla de Características
    const caracteristicasTableData = caracteristicasData.map((item, index) => ({
      index: index + 1,
      tipoBien: item["Tipo de bien"] || 'No disponible',
      cantidad: item["Cantidad"] || 'No disponible',
      dimensiones: item["Dimensiones del espacio disponible"] || 'No disponible',
      dimensionesDelBien: item["Dimensiones del bien (referencias del catalogo)"] || 'No disponible',
      otrasCaracteristicas: item["Otras caracteristicas (tipo de voltaje requerido, entre otros)"] || 'No disponible',
    }));

    // Definir columnas para la tabla de Características
    const caracteristicasColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Tipo de Bien', dataKey: 'tipoBien' },
      { header: 'Dimensiones del espacio disponible', dataKey: 'dimensiones' },
      { header: 'Dimensiones del bien', dataKey: 'dimensionesDelBien' },
      { header: 'Otras Características', dataKey: 'otrasCaracteristicas' },
    ];

    // Agregar la tabla de Características
    doc.autoTable({
      startY: yPosition,
      head: [caracteristicasColumns.map(col => col.header)],
      body: caracteristicasTableData.map(row => caracteristicasColumns.map(col => row[col.dataKey])),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // Descargar PDF
    doc.save('Informe_Emprendimiento.pdf');
  };

  return (
    <div>
      <h3>Generar PDF</h3>
      <button onClick={generatePDF} className="btn btn-primary" disabled={loading}>
        Descargar PDF
      </button>
      {loading && <p>Cargando datos, por favor espera...</p>}
    </div>
  );
}




