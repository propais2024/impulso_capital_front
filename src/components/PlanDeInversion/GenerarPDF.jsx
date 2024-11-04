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

        // Obtener datos de `pi_datos`
        const datosResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_datos/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDatosTab(datosResponse.data[0] || {});

        // Obtener datos de `pi_diagnostico`
        const diagnosticoResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_diagnostico/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDiagnosticoData(diagnosticoResponse.data || []);

        // Obtener datos de `pi_activos`
        const activosResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_activos/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setActivosData(activosResponse.data || []);

        // Obtener datos de `pi_caracteristicas`
        const caracteristicasResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_caracteristicas/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCaracteristicasData(caracteristicasResponse.data || []);

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
    doc.text(`Nombre comercial: ${caracterizacionData["Nombre comercial"] || 'No disponible'}`, 40, 120);
    doc.text(`Localidad: ${getColumnDisplayValue("Localidad unidad RIC", caracterizacionData["Localidad unidad RIC"]) || 'No disponible'}`, 40, 135);
    doc.text(`Barrio: ${getColumnDisplayValue("Barrio de residencia", caracterizacionData["Barrio de residencia"]) || 'No disponible'}`, 40, 150);
    doc.text(`Dirección: ${caracterizacionData["Direccion unidad RIC"] || 'No disponible'}`, 40, 165);
    doc.text(`Número de contacto: ${caracterizacionData["Numero movil 1 ciudadano"] || 'No disponible'}`, 40, 180);

    // Información del emprendedor
    doc.text("Información del Emprendedor", 40, 220);
    const nombreEmprendedor = [
      caracterizacionData["Primer nombre"] || '',
      caracterizacionData["Otros nombres"] || '',
      caracterizacionData["Primer apellido"] || '',
      caracterizacionData["Segundo apellido"] || ''
    ].filter(Boolean).join(' ');
    doc.text(`Nombre emprendedor: ${nombreEmprendedor || 'No disponible'}`, 40, 240);
    doc.text(`Tipo documento identidad: ${getColumnDisplayValue("Tipo de documento", caracterizacionData["Tipo de documento"]) || 'No disponible'}`, 40, 255);
    doc.text(`Número documento identidad: ${caracterizacionData["Numero de documento de identificacion ciudadano"] || 'No disponible'}`, 40, 270);

    // Diagnóstico del negocio
    doc.setFillColor(200, 200, 200);
    doc.rect(40, 300, 515, 25, 'F');
    doc.text("DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA", 250, 317, { align: 'center' });
    let yPosition = 345;
    diagnosticoData.forEach((item, index) => {
      doc.text(`${index + 1}. Área: ${item["Area de fortalecimiento"]}`, 40, yPosition);
      doc.text(`Descripción: ${item["Descripcion de la problematica"]}`, 40, yPosition + 15);
      doc.text(`Propuesta: ${item["Propuesta de mejora"]}`, 40, yPosition + 30);
      yPosition += 50;
    });

    // Activos actuales
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 25, 'F');
    doc.text("DESCRIPCIÓN ACTIVOS ACTUALES", 250, yPosition + 17, { align: 'center' });
    yPosition += 45;
    activosData.forEach((item, index) => {
      doc.text(`${index + 1}. Equipo: ${item["Equipo"]}`, 40, yPosition);
      doc.text(`Descripción: ${item["Descripcion"]}`, 40, yPosition + 15);
      doc.text(`Vida Útil: ${item["Vida Util"]}`, 40, yPosition + 30);
      doc.text(`Frecuencia de Uso: ${item["Frecuencia de uso"]}`, 40, yPosition + 45);
      doc.text(`Elemento para Reposición: ${item["Elemento para reposicion"]}`, 40, yPosition + 60);
      doc.text(`Valor Estimado: ${item["Valor estimado"]}`, 40, yPosition + 75);
      yPosition += 90;
    });

    // Características del espacio
    doc.setFillColor(200, 200, 200);
    doc.rect(40, yPosition, 515, 25, 'F');
    doc.text("DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO DISPONIBLE", 250, yPosition + 17, { align: 'center' });
    yPosition += 45;
    caracteristicasData.forEach((item, index) => {
      doc.text(`${index + 1}. Tipo de Bien: ${item["Tipo de bien"]}`, 40, yPosition);
      doc.text(`Cantidad: ${item["Cantidad"]}`, 40, yPosition + 15);
      doc.text(`Dimensión del Espacio: ${item["Dimension del espacio disponible"]}`, 40, yPosition + 30);
      doc.text(`Dimensiones del Bien: ${item["Dimensiones del bien"]}`, 40, yPosition + 45);
      doc.text(`Valor de Referencia: ${item["Valor de referencia"]}`, 40, yPosition + 60);
      yPosition += 75;
    });

    // Descargar el PDF
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



