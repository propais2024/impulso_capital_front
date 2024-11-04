import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
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

    // Plan de Inversión
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition += 30, 515, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("PLAN DE INVERSIÓN", 250, yPosition + 15, { align: 'center' });

    // Datos de pi_datos
    doc.setFontSize(10);
    doc.text(`Tiempo dedicación: ${datosTab["Tiempo de dedicacion al negocio (Parcial o Completo)"] || 'No disponible'}`, 40, yPosition += 40);
    doc.text(`Descripcion general del negocio: ${datosTab["Descripcion general del negocio"] || 'No disponible'}`, 40, 380);
    doc.text(`Descripcion de el lugar donde desarrolla la actividad: ${datosTab["Descripcion de el lugar donde desarrolla la actividad"] || 'No disponible'}`, 40, 400);
    doc.text(`Descripcion de los activos del negocio: ${datosTab["Descripcion de los activos del negocio"] || 'No disponible'}`, 40, 420);
    doc.text(`Valor aproximado de los activos del negocio: ${datosTab["Valor aproximado de los activos del negocio"] || 'No disponible'}`, 40, 440);
    doc.text(`Total costos fijos mensuales: ${datosTab["Total costos fijos mensuales"] || 'No disponible'}`, 40, 460);
    doc.text(`Total costos variables: ${datosTab["Total costos variables"] || 'No disponible'}`, 40, 480);
    doc.text(`Total gastos mensuales: ${datosTab["Total gastos mensuales"] || 'No disponible'}`, 40, 500);
    doc.text(`Total ventas mensuales del negocio: ${datosTab["Total ventas mensuales del negocio"] || 'No disponible'}`, 40, 520);
    doc.text(`Descripcion de la capacidad de produccion: ${datosTab["Descripcion de la capacidad de produccion"] || 'No disponible'}`, 40, 540);
    doc.text(`Valor de los gastos familiares mensuales promedio: ${datosTab["Valor de los gastos familiares mensuales promedio"] || 'No disponible'}`, 40, 560);
    doc.text(`Lleva registros separados de finanzas personales y del negocio: ${datosTab["Lleva registros separados de finanzas personales y del negocio"] || 'No disponible'}`, 40, 580);
    doc.text(`Usa billeteras moviles: ${datosTab["Usa billeteras moviles"] || 'No disponible'}`, 40, 600);
    doc.text(`Cual: ${datosTab["Cual"] || 'No disponible'}`, 40, 620);
    doc.text(`Concepto y justificacion del valor de la capitalizacion: ${datosTab["Concepto y justificacion del valor de la capitalizacion"] || 'No disponible'}`, 40, 640);
    doc.text(`Como contribuira la inversion a la mejora productiva del negocio: ${datosTab["Como contribuira la inversion a la mejora productiva del negoci"] || 'No disponible'}`, 40, 660);
    doc.text(`El negocio es sujeto de participacion en espacios de conexion: ${datosTab["El negocio es sujeto de participacion en espacios de conexion"] || 'No disponible'}`, 40, 680);
    doc.text(`Recomendaciones tecnica, administrativas y financieras: ${datosTab["Recomendaciones tecnica, administrativas y financieras"] || 'No disponible'}`, 40, 700);


    // Tabla Diagnóstico
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition += 60, 515, 20, 'F');
    doc.text("DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA", 250, yPosition + 15, { align: 'center' });

    yPosition += 40;
    diagnosticoData.forEach((item, index) => {
      doc.text(`${index + 1}. Área: ${item["Area de fortalecimiento"] || 'No disponible'}`, 40, yPosition);
      doc.text(`Descripción: ${item["Descripcion de la problematica"] || 'No disponible'}`, 60, yPosition + 15);
      doc.text(`Propuesta: ${item["Propuesta de mejora"] || 'No disponible'}`, 60, yPosition + 30);
      yPosition += 50;
    });

    // Tabla Activos
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 20, 'F');
    doc.text("DESCRIPCIÓN ACTIVOS ACTUALES", 250, yPosition + 15, { align: 'center' });

    yPosition += 40;
    activosData.forEach((item, index) => {
      doc.text(`${index + 1}. Equipo: ${item["Equipo"] || 'No disponible'}`, 40, yPosition);
      doc.text(`Descripción: ${item["Descripcion"] || 'No disponible'}`, 60, yPosition + 15);
      doc.text(`Vida útil: ${item["Vida Util"] || 'No disponible'}`, 60, yPosition + 30);
      doc.text(`Frecuencia: ${item["Frecuencia de uso"] || 'No disponible'}`, 60, yPosition + 45);
      doc.text(`Elemento para reposición: ${item["Elemento para reposicion"] || 'No disponible'}`, 60, yPosition + 60);
      doc.text(`Valor estimado: ${item["Valor estimado"] || 'No disponible'}`, 60, yPosition + 75);
      yPosition += 90;
    });

    // Tabla Características
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 20, 'F');
    doc.text("DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO", 250, yPosition + 15, { align: 'center' });
    yPosition += 35;
    caracteristicasData.forEach((item, index) => {
      doc.text(`${index + 1}. Tipo Bien: ${item["Tipo de bien"] || 'No disponible'}`, 40, yPosition);
      doc.text(`Dimensiones: ${item["Dimension del espacio disponible"] || 'No disponible'}`, 60, yPosition + 15);
      doc.text(`Valor de referencia: ${item["Valor de referencia"] || 'No disponible'}`, 60, yPosition + 30);
      yPosition += 50;
    });

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



