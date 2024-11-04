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
  const [piFormulacionRecords, setPiFormulacionRecords] = useState([]);
  const [groupedRubros, setGroupedRubros] = useState([]);
  const [totalInversion, setTotalInversion] = useState(0);
  const [relatedData, setRelatedData] = useState({});
  const [providerRelatedData, setProviderRelatedData] = useState({});
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

        // Obtener datos de pi_formulacion y proveedores asociados
        const piFormulacionUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/pi_formulacion/records?caracterizacion_id=${id}&Seleccion=true`;
        const piFormulacionResponse = await axios.get(piFormulacionUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const piRecords = piFormulacionResponse.data;

        // Obtener IDs de proveedores
        const providerIds = piRecords.map((piRecord) => piRecord.rel_id_prov);

        // Obtener detalles de proveedores
        const providerPromises = providerIds.map((providerId) => {
          const providerUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/provider_proveedores/record/${providerId}`;
          return axios.get(providerUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
        });

        const providersResponses = await Promise.all(providerPromises);
        const providersData = providersResponses.map((res) => res.data.record);

        // Obtener datos relacionados para proveedores (Rubro y Elemento)
        const providerFieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/provider_proveedores/related-data`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProviderRelatedData(providerFieldsResponse.data.relatedData || {});

        // Combinar pi_formulacion y proveedores
        const combinedData = piRecords.map((piRecord) => {
          const providerData = providersData.find(
            (provider) => String(provider.id) === String(piRecord.rel_id_prov)
          );
          return {
            ...piRecord,
            providerData,
          };
        });

        setPiFormulacionRecords(combinedData);

        // Agrupar Rubros y calcular total inversión
        const rubroMap = {};

        combinedData.forEach((piRecord) => {
          const provider = piRecord.providerData;
          if (provider) {
            const rubroName = getProviderColumnDisplayValue('Rubro', provider.Rubro);
            const precio = parseFloat(provider.Precio) || 0;
            const cantidad = parseFloat(piRecord.Cantidad) || 1;
            const totalPrice = precio * cantidad;

            if (rubroMap[rubroName]) {
              rubroMap[rubroName] += totalPrice;
            } else {
              rubroMap[rubroName] = totalPrice;
            }
          }
        });

        const groupedRubrosArray = Object.entries(rubroMap).map(([rubro, total]) => ({
          rubro,
          total: total.toFixed(2),
        }));

        const totalInv = groupedRubrosArray.reduce(
          (acc, record) => acc + parseFloat(record.total || 0),
          0
        ).toFixed(2);

        setGroupedRubros(groupedRubrosArray);
        setTotalInversion(totalInv);

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

  const getProviderColumnDisplayValue = (column, value) => {
    if (providerRelatedData[column]) {
      const relatedRecord = providerRelatedData[column].find(
        (item) => String(item.id) === String(value)
      );
      return relatedRecord ? relatedRecord.displayValue : `ID: ${value}`;
    }
    return value;
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 100;

    // Estilos de fuente
    const fontSizes = {
      title: 14,
      subtitle: 12,
      normal: 10,
    };

    // Encabezado
    doc.setFontSize(fontSizes.title);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, 40, maxLineWidth, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("ESPACIO PARA HEADER", pageWidth / 2, 58, { align: 'center' });

    // Información del emprendimiento
    doc.setFontSize(fontSizes.subtitle);
    doc.text("Información del Emprendimiento", margin, yPosition);

    doc.setFontSize(fontSizes.normal);
    const nombreComercial = caracterizacionData["Nombre comercial"] || 'No disponible';
    const localidadNombre = getColumnDisplayValue("Localidad unidad RIC", caracterizacionData["Localidad unidad RIC"]);
    const barrioNombre = getColumnDisplayValue("Barrio de residencia", caracterizacionData["Barrio de residencia"]);
    const direccion = caracterizacionData["Direccion unidad RIC"] || 'No disponible';
    const numeroContacto = caracterizacionData["Numero movil 1 ciudadano"] || 'No disponible';

    yPosition += 20;
    const infoEmprendimiento = [
      `Nombre comercial: ${nombreComercial}`,
      `Localidad: ${localidadNombre || 'No disponible'}`,
      `Barrio: ${barrioNombre || 'No disponible'}`,
      `Dirección: ${direccion}`,
      `Número de contacto: ${numeroContacto}`,
    ];

    infoEmprendimiento.forEach(text => {
      const lines = doc.splitTextToSize(text, maxLineWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 12;
    });

    // Información del emprendedor
    doc.setFontSize(fontSizes.subtitle);
    yPosition += 10;
    doc.text("Información del Emprendedor", margin, yPosition);

    doc.setFontSize(fontSizes.normal);
    const nombreEmprendedor = [
      caracterizacionData["Primer nombre"] || '',
      caracterizacionData["Otros nombres"] || '',
      caracterizacionData["Primer apellido"] || '',
      caracterizacionData["Segundo apellido"] || ''
    ].filter(Boolean).join(' ');

    const tipoDocumento = getColumnDisplayValue("Tipo de documento", caracterizacionData["Tipo de documento"]);
    const numeroDocumento = caracterizacionData["Numero de documento de identificacion ciudadano"] || 'No disponible';

    yPosition += 20;
    const infoEmprendedor = [
      `Nombre emprendedor: ${nombreEmprendedor || 'No disponible'}`,
      `Tipo documento identidad: ${tipoDocumento || 'No disponible'}`,
      `Número documento identidad: ${numeroDocumento}`,
    ];

    infoEmprendedor.forEach(text => {
      const lines = doc.splitTextToSize(text, maxLineWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 12;
    });

    // Plan de Inversión
    doc.setFontSize(fontSizes.title);
    yPosition += 20;
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("PLAN DE INVERSIÓN", pageWidth / 2, yPosition + 18, { align: 'center' });

    // Datos de pi_datos
    doc.setFontSize(fontSizes.normal);
    yPosition += 40;
    const datosKeys = [
      "Tiempo de dedicacion al negocio (Parcial o Completo)",
      "Descripcion general del negocio",
      "Descripcion de el lugar donde desarrolla la actividad",
      "Descripcion de los activos del negocio",
      "Valor aproximado de los activos del negocio",
      "Total costos fijos mensuales",
      "Total costos variables",
      "Total gastos mensuales",
      "Total ventas mensuales del negocio",
      "Descripcion de la capacidad de produccion",
      "Valor de los gastos familiares mensuales promedio",
      "Lleva registros separados de finanzas personales y del negocio",
      "Usa billeteras moviles",
      "Cual",
      "Concepto y justificacion del valor de la capitalizacion",
      "Como contribuira la inversion a la mejora productiva del negoci",
      "El negocio es sujeto de participacion en espacios de conexion",
      "Recomendaciones tecnica, administrativas y financieras"
    ];

    datosKeys.forEach(key => {
      const label = key.replace(/_/g, ' ') + ':';
      const value = datosTab[key] || 'No disponible';
      const fullText = `${label} ${value}`;
      const lines = doc.splitTextToSize(fullText, maxLineWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 12;
    });

    // DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA
    doc.setFontSize(fontSizes.title);
    yPosition += 20;
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
    doc.text("DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA", pageWidth / 2, yPosition + 18, { align: 'center' });

    yPosition += 35;

    // Preparar datos para la tabla de Diagnóstico
    const diagnosticoTableData = diagnosticoData.map((item, index) => ({
      index: index + 1,
      area: item["Area de fortalecimiento"] || 'No disponible',
      descripcion: item["Descripcion del area critica por area de fortalecimiento"] || 'No disponible',
      propuesta: item["Propuesta de mejora"] || 'No disponible',
    }));

    const diagnosticoColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Área de Fortalecimiento', dataKey: 'area' },
      { header: 'Descripción', dataKey: 'descripcion' },
      { header: 'Propuesta de Mejora', dataKey: 'propuesta' },
    ];

    doc.autoTable({
      startY: yPosition,
      head: [diagnosticoColumns.map(col => col.header)],
      body: diagnosticoTableData.map(row => diagnosticoColumns.map(col => row[col.dataKey])),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // DESCRIPCIÓN ACTIVOS ACTUALES
    doc.setFontSize(fontSizes.title);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
    doc.text("DESCRIPCIÓN ACTIVOS ACTUALES", pageWidth / 2, yPosition + 18, { align: 'center' });

    yPosition += 35;

    const activosTableData = activosData.map((item, index) => ({
      index: index + 1,
      equipo: item["Equipo"] || 'No disponible',
      descripcion: item["Descripcion"] || 'No disponible',
      vidaUtil: item["Vida util"] || 'No disponible',
      frecuenciaUso: item["Frecuencia de uso (media alta, baja)"] || 'No disponible',
      elementoReposicion: item["Elemento para reposicion (SI NO)"] || 'No disponible',
    }));

    const activosColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Equipo', dataKey: 'equipo' },
      { header: 'Descripción', dataKey: 'descripcion' },
      { header: 'Vida Útil', dataKey: 'vidaUtil' },
      { header: 'Frecuencia de Uso', dataKey: 'frecuenciaUso' },
      { header: 'Elemento para Reposición', dataKey: 'elementoReposicion' },
    ];

    doc.autoTable({
      startY: yPosition,
      head: [activosColumns.map(col => col.header)],
      body: activosTableData.map(row => activosColumns.map(col => row[col.dataKey])),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO
    doc.setFontSize(fontSizes.title);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
    doc.text("DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO DISPONIBLE PARA LA INSTALACIÓN Y/O UTILIZACIÓN DEL (LOS) BIEN(ES) DE INVERSIÓN", pageWidth / 2, yPosition + 18, { align: 'center' });

    yPosition += 35;

    const caracteristicasTableData = caracteristicasData.map((item, index) => ({
      index: index + 1,
      tipoBien: item["Tipo de bien"] || 'No disponible',
      cantidad: item["Cantidad"] || 'No disponible',
      dimensiones: item["Dimensiones del espacio disponible"] || 'No disponible',
      dimensionesDelBien: item["Dimensiones del bien (referencias del catalogo)"] || 'No disponible',
      otrasCaracteristicas: item["Otras caracteristicas (tipo de voltaje requerido, entre otros)"] || 'No disponible',
    }));

    const caracteristicasColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Tipo de Bien', dataKey: 'tipoBien' },
      { header: 'Cantidad', dataKey: 'cantidad' },
      { header: 'Dimensiones del espacio disponible', dataKey: 'dimensiones' },
      { header: 'Dimensiones del bien', dataKey: 'dimensionesDelBien' },
      { header: 'Otras Características', dataKey: 'otrasCaracteristicas' },
    ];

    doc.autoTable({
      startY: yPosition,
      head: [caracteristicasColumns.map(col => col.header)],
      body: caracteristicasTableData.map(row => caracteristicasColumns.map(col => row[col.dataKey])),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // Productos Seleccionados
    doc.setFontSize(fontSizes.title);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
    doc.text("PRODUCTOS SELECCIONADOS", pageWidth / 2, yPosition + 18, { align: 'center' });

    yPosition += 35;

    const productosTableData = piFormulacionRecords.map((piRecord, index) => {
      const provider = piRecord.providerData;
      const cantidad = parseFloat(piRecord.Cantidad) || 1;
      const precio = parseFloat(provider.Precio) || 0;
      const total = (precio * cantidad).toFixed(2);

      const rubroName = getProviderColumnDisplayValue('Rubro', provider.Rubro);
      const elementoName = getProviderColumnDisplayValue('Elemento', provider.Elemento);

      return {
        index: index + 1,
        nombreProveedor: provider["Nombre proveedor"] || 'No disponible',
        rubro: rubroName || 'No disponible',
        elemento: elementoName || 'No disponible',
        descripcion: provider["Descripcion corta"] || 'No disponible',
        precioUnitario: provider.Precio || '0',
        cantidad: cantidad.toString(),
        total,
      };
    });

    const productosColumns = [
      { header: 'No.', dataKey: 'index' },
      { header: 'Nombre Proveedor', dataKey: 'nombreProveedor' },
      { header: 'Rubro', dataKey: 'rubro' },
      { header: 'Elemento', dataKey: 'elemento' },
      { header: 'Descripción', dataKey: 'descripcion' },
      { header: 'Precio Unitario', dataKey: 'precioUnitario' },
      { header: 'Cantidad', dataKey: 'cantidad' },
      { header: 'Total', dataKey: 'total' },
    ];

    doc.autoTable({
      startY: yPosition,
      head: [productosColumns.map(col => col.header)],
      body: productosTableData.map(row => productosColumns.map(col => row[col.dataKey])),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPosition = data.cursor.y; },
    });

    yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

    // Resumen de la Inversión
    doc.setFontSize(fontSizes.title);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
    doc.text("RESUMEN DE LA INVERSIÓN", pageWidth / 2, yPosition + 18, { align: 'center' });

    yPosition += 35;

    const resumenColumns = [
      { header: 'Rubro', dataKey: 'rubro' },
      { header: 'Valor', dataKey: 'total' },
    ];

    doc.autoTable({
      startY: yPosition,
      head: [resumenColumns.map(col => col.header)],
      body: groupedRubros.map(row => resumenColumns.map(col => row[col.dataKey])),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
    });

    yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
    doc.setFontSize(fontSizes.subtitle);
    doc.text(`Total Inversión: $${totalInversion}`, pageWidth - margin, yPosition, { align: 'right' });

    yPosition += 30;
    doc.setFontSize(fontSizes.subtitle);
    doc.setTextColor(0, 0, 0);
    doc.text("CONCEPTO DE VIABILIDAD", pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 20;
    doc.setFontSize(fontSizes.normal);
    const textoViabilidad = [
      "Yo, Nombre del asesor, identificado con documento de identidad 123456789 expedido en",
      "la ciudad de BOGOTA, en mi calidad de asesor empresarial del micronegocio denominado",
      "Nombre del emprendimiento y haciendo parte del equipo ejecutor del programa “Impulso Capital”",
      "suscrito entre la Corporación para el Desarrollo de las Microempresas - Propaís y la Secretaría de",
      "Desarrollo Económico - SDDE, emito concepto de VIABILIDAD para que el emprendedor pueda",
      "acceder a los recursos de capitalización proporcionados por el citado programa."
    ];

    textoViabilidad.forEach(line => {
      const lines = doc.splitTextToSize(line, maxLineWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 12;
    });

    yPosition += 10;
    doc.setFontSize(8);
    const notas = [
      "Nota: El valor detallado en el presente documento corresponde a la planeación de la inversiones",
      "que requiere cada negocio local, sin embargo, es preciso aclarar que, el programa impulso capital",
      "no capitalizará este valor en su totalidad, sino que fortalecerá cada unidad productiva con",
      "algunos de estos bienes hasta por $3.000.000 de pesos en total, de acuerdo con la",
      "disponibilidad de los mismos y la mayor eficiencia en el uso de los recursos públicos."
    ];

    notas.forEach(line => {
      const lines = doc.splitTextToSize(line, maxLineWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 10;
    });

    yPosition += 15;
    const notasAdicional = [
      "Nota: Declaro que toda la información sobre el plan de inversión aquí consignada fue diligenciada",
      "en conjunto con el asesor empresarial a cargo, está de acuerdo con las condiciones del negocio,",
      "es verdadera, completa y correcta, la cual puede ser verificada en cualquier momento."
    ];

    notasAdicional.forEach(line => {
      const lines = doc.splitTextToSize(line, maxLineWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 10;
    });

    yPosition += 40;
    doc.setFontSize(fontSizes.subtitle);
    doc.text("FIRMAS", pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 30;
    doc.setFontSize(fontSizes.normal);
    doc.text("Emprendedor", margin + 70, yPosition);
    doc.text("Asesor", pageWidth - margin - 70, yPosition, { align: 'right' });

    yPosition += 10;
    doc.rect(margin + 30, yPosition, 150, 40);
    doc.rect(pageWidth - margin - 180, yPosition, 150, 40);

    yPosition += 55;
    doc.text("Nombre del emprendedor", margin + 40, yPosition);
    doc.text("Nombre del asesor", pageWidth - margin - 170, yPosition);

    yPosition += 15;
    doc.text("C.C. 123456789", margin + 70, yPosition);
    doc.text("C.C. 123456789", pageWidth - margin - 140, yPosition);

    yPosition += 40;
    const fecha = new Date();
    doc.text(`Fecha y hora de generación`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    doc.text(fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString(), pageWidth / 2, yPosition, { align: 'center' });

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





