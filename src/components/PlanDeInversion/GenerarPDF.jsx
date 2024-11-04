import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import axios from 'axios';

export default function GenerarPDF({ id }) {
  const [caracterizacionData, setCaracterizacionData] = useState({});
  const [datosTab, setDatosTab] = useState({});
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
        const data = caracterizacionResponse.data.record;
        setCaracterizacionData(data);
        console.log("Datos de caracterización obtenidos:", data);

        // Obtener datos relacionados para claves foráneas
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/inscription_caracterizacion/related-data`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRelatedData(fieldsResponse.data.relatedData || {});
        console.log("Datos relacionados de claves foráneas:", fieldsResponse.data.relatedData);

        // Obtener datos de `pi_datos` para el caracterizacion_id
        const datosResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_datos/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (datosResponse.data.length > 0) {
          setDatosTab(datosResponse.data[0]);
          console.log("Datos de pi_datos obtenidos:", datosResponse.data[0]);
        }

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

    // Encabezado
    doc.setFillColor(200, 200, 200);
    doc.rect(40, 40, 515, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("ESPACIO PARA HEADER", 250, 58, { align: 'center' });

    // Información del emprendimiento
    doc.setFontSize(12);
    doc.text("Información del Emprendimiento", 40, 100);

    doc.setFontSize(10);
    const nombreComercial = caracterizacionData["Nombre comercial"] || caracterizacionData["NOMBRE COMERCIAL"] || 'No disponible';
    const localidadNombre = getColumnDisplayValue("Localidad unidad RIC", caracterizacionData["Localidad unidad RIC"]);
    const barrioNombre = getColumnDisplayValue("Barrio de residencia", caracterizacionData["Barrio de residencia"]);
    const direccion = caracterizacionData["Direccion unidad RIC"] || 'No disponible';
    const numeroContacto = caracterizacionData["Numero movil 1 ciudadano"] || 'No disponible';

    doc.text(`Nombre comercial: ${nombreComercial}`, 40, 120);
    doc.text(`Localidad: ${localidadNombre || 'No disponible'}`, 40, 135);
    doc.text(`Barrio: ${barrioNombre || 'No disponible'}`, 40, 150);
    doc.text(`Dirección: ${direccion}`, 40, 165);
    doc.text(`Número de contacto: ${numeroContacto}`, 40, 180);

    // Información del emprendedor
    doc.setFontSize(12);
    doc.text("Información del Emprendedor", 40, 220);

    doc.setFontSize(10);
    const nombreEmprendedor = [
      caracterizacionData["Primer nombre"] || '',
      caracterizacionData["Otros nombres"] || '',
      caracterizacionData["Primer apellido"] || '',
      caracterizacionData["Segundo apellido"] || ''
    ].filter(Boolean).join(' ');

    const tipoDocumento = getColumnDisplayValue("Tipo de documento", caracterizacionData["Tipo de documento"]);
    const numeroDocumento = caracterizacionData["Numero de documento de identificacion ciudadano"] || 'No disponible';

    doc.text(`Nombre emprendedor: ${nombreEmprendedor || 'No disponible'}`, 40, 240);
    doc.text(`Tipo documento identidad: ${tipoDocumento || 'No disponible'}`, 40, 255);
    doc.text(`Número documento identidad: ${numeroDocumento}`, 40, 270);

    // Plan de Inversión - Información de `pi_datos`
    doc.setFillColor(200, 200, 200);
    doc.rect(40, 315, 515, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("PLAN DE INVERSIÓN", 250, 332, { align: 'center' });

    // Datos de la tabla `pi_datos`
    doc.setFontSize(10);
    doc.text(`Descripción general del negocio: ${datosTab["Descripción general del negocio"] || 'No disponible'}`, 40, 360);
    doc.text(`Descripción del lugar donde desarrolla la actividad: ${datosTab["Descripción del lugar donde desarrolla la actividad"] || 'No disponible'}`, 40, 380);
    doc.text(`Descripción de los activos del negocio: ${datosTab["Descripción de los activos del negocio equipos - maquinaria - mobiliario"] || 'No disponible'}`, 40, 400);
    doc.text(`Valor aproximado de los activos del negocio: ${datosTab["Valor aproximado de los activos del negocio"] || 'No disponible'}`, 40, 420);
    doc.text(`Total costos fijos mensuales: ${datosTab["Total costos fijos mensuales"] || 'No disponible'}`, 40, 440);
    doc.text(`Total costos variables: ${datosTab["Total costos variables"] || 'No disponible'}`, 40, 460);
    doc.text(`Total gastos mensuales: ${datosTab["Total gastos mensuales"] || 'No disponible'}`, 40, 480);
    doc.text(`Total ventas mensuales del negocio: ${datosTab["Total ventas mensuales del negocio"] || 'No disponible'}`, 40, 500);
    doc.text(`Descripción de la capacidad de producción: ${datosTab["Descripción de la capacidad de producción"] || 'No disponible'}`, 40, 520);
    doc.text(`Valor de los gastos familiares mensuales promedio: ${datosTab["Valor de los gastos familiares mensuales promedio"] || 'No disponible'}`, 40, 540);
    doc.text(`Lleva registros separados de las finanzas personales y las del negocio: ${datosTab["Lleva registros separados de las finanzas personales y las del negocio"] || 'No disponible'}`, 40, 560);
    doc.text(`Usa billeteras móviles: ${datosTab["Usa billeteras móviles"] || 'No disponible'}`, 40, 580);
    doc.text(`¿Cuál?: ${datosTab["Cuál"] || 'No disponible'}`, 40, 600);

    // Descarga el PDF
    doc.save('Informe_Emprendimiento.pdf');
  };

  return (
    <div>
      <h3>Generar PDF</h3>
      <button
        onClick={generatePDF}
        className="btn btn-primary"
        disabled={loading}
      >
        Descargar PDF
      </button>
      {loading && <p>Cargando datos, por favor espera...</p>}
    </div>
  );
}


