import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import axios from 'axios';

export default function GenerarPDF({ id }) {
  const [caracterizacionData, setCaracterizacionData] = useState({});
  const [datosTab, setDatosTab] = useState({});
  const [foreignData, setForeignData] = useState({});
  const [loading, setLoading] = useState(true); // Estado para controlar la carga de datos

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.error("El ID del registro de caracterización no está definido.");
        return;
      }

      try {
        const token = localStorage.getItem('token');

        // Obtener los datos de `inscription_caracterizacion` usando el `id` proporcionado
        const caracterizacionResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/inscription_caracterizacion/record/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = caracterizacionResponse.data.record;
        setCaracterizacionData(data);
        console.log("Datos de caracterización obtenidos:", data);

        // Verificar y obtener valores de claves foráneas (ej. "Localidad unidad RIC")
        const foreignFields = {
          localidad: `https://impulso-capital-back.onrender.com/api/inscriptions/tables/localidad/record/${data["Localidad unidad RIC"]}`
          // Agrega más claves foráneas si es necesario
        };

        const foreignDataPromises = Object.keys(foreignFields).map(async (field) => {
          try {
            const response = await axios.get(foreignFields[field], {
              headers: { Authorization: `Bearer ${token}` }
            });
            return { [field]: response.data.record.nombre }; // Ajusta 'nombre' al campo descriptivo correcto
          } catch (error) {
            console.error(`Error obteniendo datos de clave foránea para ${field}:`, error);
            return { [field]: 'No disponible' };
          }
        });

        const foreignResults = await Promise.all(foreignDataPromises);
        const foreignDataResolved = foreignResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setForeignData(foreignDataResolved);
        console.log("Datos de claves foráneas obtenidos:", foreignDataResolved);

        // Obtener datos de `pi_datos` usando `caracterizacion_id`
        const datosResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_datos/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (datosResponse.data.length > 0) {
          setDatosTab(datosResponse.data[0]);
          console.log("Datos de pi_datos obtenidos:", datosResponse.data[0]);
        }
        
        // Establecer que la carga ha terminado
        setLoading(false);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      }
    };

    fetchData();
  }, [id]);

  const generatePDF = () => {
    if (loading) {
      console.log("Los datos aún están cargando...");
      return; // Evita generar el PDF si los datos aún no están listos
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    // Encabezado
    doc.setFillColor(200, 200, 200); // Color gris claro
    doc.rect(40, 40, 515, 25, 'F'); // Rectángulo de fondo gris para el header
    doc.setTextColor(0, 0, 0); // Color del texto negro
    doc.text("ESPACIO PARA HEADER", 250, 58, { align: 'center' });

    // Información del emprendimiento
    doc.setFontSize(12);
    doc.text("Información del Emprendimiento", 40, 100);

    doc.setFontSize(10);
    const nombreComercial = caracterizacionData["Nombre comercial"] || caracterizacionData["NOMBRE COMERCIAL"] || 'No disponible';
    console.log("Nombre comercial:", nombreComercial);

    doc.text(`Nombre comercial: ${nombreComercial}`, 40, 120);
    doc.text(`Localidad: ${foreignData.localidad || 'No disponible'}`, 40, 135); // Usa el valor descriptivo de la localidad
    doc.text(`Dirección: ${caracterizacionData.direccion || 'No disponible'}`, 40, 150);
    doc.text(`Número de contacto: ${caracterizacionData.numero_contacto || 'No disponible'}`, 40, 165);

    // Información del emprendedor
    doc.setFontSize(12);
    doc.text("Información del Emprendedor", 40, 200);

    doc.setFontSize(10);
    doc.text(`Nombre emprendedor: ${caracterizacionData.nombre_emprendedor || 'No disponible'}`, 40, 220);
    doc.text(`Tipo documento identidad: ${caracterizacionData.tipo_documento || 'No disponible'}`, 40, 235);
    doc.text(`Número documento identidad: ${caracterizacionData.numero_documento || 'No disponible'}`, 40, 250);
    doc.text(`Tiempo dedicación al negocio: ${caracterizacionData.tiempo_dedicacion || 'No disponible'}`, 40, 265);

    // Plan de Inversión - Información de `pi_datos`
    doc.setFillColor(200, 200, 200);
    doc.rect(40, 295, 515, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("PLAN DE INVERSIÓN", 250, 312, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Descripción general del negocio: ${datosTab["Descripción general del negocio"] || 'No disponible'}`, 40, 340);
    doc.text(`Descripción del lugar donde desarrolla la actividad: ${datosTab["Descripción del lugar donde desarrolla la actividad"] || 'No disponible'}`, 40, 355);
    doc.text(`Descripción de los activos del negocio: ${datosTab["Descripción de los activos del negocio equipos - maquinaria - mobiliario"] || 'No disponible'}`, 40, 370);
    doc.text(`Valor aproximado de los activos del negocio: ${datosTab["Valor aproximado de los activos del negocio"] || 'No disponible'}`, 40, 385);
    doc.text(`Total costos fijos mensuales: ${datosTab["Total costos fijos mensuales"] || 'No disponible'}`, 40, 400);
    doc.text(`Total costos variables: ${datosTab["Total costos variables"] || 'No disponible'}`, 40, 415);
    doc.text(`Total gastos mensuales: ${datosTab["Total gastos mensuales"] || 'No disponible'}`, 40, 430);
    doc.text(`Total ventas mensuales del negocio: ${datosTab["Total ventas mensuales del negocio"] || 'No disponible'}`, 40, 445);
    doc.text(`Descripción de la capacidad de producción: ${datosTab["Descripción de la capacidad de producción"] || 'No disponible'}`, 40, 460);
    doc.text(`Valor de los gastos familiares mensuales promedio: ${datosTab["Valor de los gastos familiares mensuales promedio"] || 'No disponible'}`, 40, 475);
    doc.text(`Lleva registros separados de las finanzas personales y las del negocio: ${datosTab["Lleva registros separados de las finanzas personales y las del negocio"] || 'No disponible'}`, 40, 490);
    doc.text(`Usa billeteras móviles: ${datosTab["Usa billeteras móviles"] || 'No disponible'}`, 40, 505);
    doc.text(`¿Cuál?: ${datosTab["Cuál"] || 'No disponible'}`, 40, 520);

    // Descarga el PDF
    doc.save('Informe_Emprendimiento.pdf');
  };

  return (
    <div>
      <h3>Generar PDF</h3>
      <button onClick={generatePDF} disabled={loading} className="btn btn-primary">
        Descargar PDF
      </button>
      {loading && <p>Los datos están cargando, por favor espera...</p>}
    </div>
  );
}