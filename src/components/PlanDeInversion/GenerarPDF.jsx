// GenerarPDF.jsx

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';

// Importar la imagen
import bannerImage from '../../assets/img/Banner_Impulso_Capital_logos.jpg';

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

  // Nuevos estados para almacenar los nombres
  const [asesorNombre, setAsesorNombre] = useState('');
  const [emprendedorNombre, setEmprendedorNombre] = useState('');
  const [asesorDocumento, setAsesorDocumento] = useState('');

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

        // Obtener datos del asesor
        const asesorId = caracterizacionResponse.data.record.Asesor;
        if (asesorId) {
          const asesorResponse = await axios.get(
            `https://impulso-capital-back.onrender.com/api/inscriptions/tables/users/record/${asesorId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const asesorData = asesorResponse.data.record;
          const nombreAsesor = asesorData.username || 'No asignado';
          setAsesorNombre(nombreAsesor);

          // Obtener el documento del asesor
          const documentoAsesor = asesorData.documento || 'No disponible';
          setAsesorDocumento(documentoAsesor);
        } else {
          setAsesorNombre('No asignado');
          setAsesorDocumento('No disponible');
        }

        // Obtener nombre del beneficiario
        const nombreEmprendedor = [
          caracterizacionResponse.data.record["Primer nombre"] || '',
          caracterizacionResponse.data.record["Otros nombres"] || '',
          caracterizacionResponse.data.record["Primer apellido"] || '',
          caracterizacionResponse.data.record["Segundo apellido"] || ''
        ].filter(Boolean).join(' ');
        setEmprendedorNombre(nombreEmprendedor || 'No disponible');

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
            const rubroId = provider.Rubro;
            const precioCatalogo = parseFloat(provider["Valor catalogo"]) || 0;
            const cantidad = parseFloat(piRecord.Cantidad) || 1;
            const totalPrice = precioCatalogo * cantidad;

            if (rubroMap[rubroId]) {
              rubroMap[rubroId] += totalPrice;
            } else {
              rubroMap[rubroId] = totalPrice;
            }
          }
        });

        // Mapeo de IDs de Rubro a nombres
        const rubroNamesMap = {
          '1': 'Equipo',
          '2': 'Herramientas',
          '3': 'Maquinaria',
          '4': 'Mobiliario',
        };

        const groupedRubrosArray = Object.entries(rubroMap).map(([rubroId, total]) => {
          const rubroName = rubroNamesMap[rubroId] || 'No disponible';
          return {
            rubro: rubroName,
            total: total.toFixed(2),
          };
        });

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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 100;

    // Estilos de fuente y color
    const fontSizes = {
      title: 12,
      subtitle: 11,
      normal: 10,
    };
    const blueColor = [77, 20, 140]; // Color #4D148C

    // Función para convertir imagen a base64
    const getImageDataUrl = (img) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      return canvas.toDataURL('image/jpeg');
    };

    // Cargar la imagen y generar el PDF después
    const img = new Image();
    img.src = bannerImage;
    img.onload = () => {
      const imgData = getImageDataUrl(img);

      // Encabezado con imagen
      doc.addImage(imgData, 'JPEG', margin, 40, maxLineWidth, 60);

      yPosition = 130; // Ajustar la posición vertical después del encabezado

      // Información del Negocio Local
      doc.setFontSize(fontSizes.subtitle);
      doc.setTextColor(0, 0, 0);
      yPosition += 10; // Añadir espacio adicional
      doc.text("Información del Negocio Local", margin, yPosition);

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

      // Agregar ID de Negocio Local encima de Nombre comercial
      const negocioId = id;
      const nombreComercial = caracterizacionData["Nombre comercial"] || 'No disponible';
      const localidadNombre = getColumnDisplayValue("Localidad unidad RIC", caracterizacionData["Localidad unidad RIC"]);
      const barrioNombre = getColumnDisplayValue("Barrio de residencia", caracterizacionData["Barrio de residencia"]);
      const direccion = caracterizacionData["Direccion unidad RIC"] || 'No disponible';
      const numeroContacto = caracterizacionData["Numero movil 1 ciudadano"] || 'No disponible';

      yPosition += 20;
      const infoEmprendimiento = [
        `ID de Negocio Local: ${negocioId}`,
        `Nombre comercial: ${nombreComercial}`,
        `Localidad: ${localidadNombre || 'No disponible'}`,
        `Barrio: ${barrioNombre || 'No disponible'}`,
        `Dirección: ${direccion}`,
        `Número de contacto: ${numeroContacto}`,
      ];

      infoEmprendimiento.forEach(text => {
        const lines = doc.splitTextToSize(text, maxLineWidth);
        const blockHeight = lines.length * 12;
        yPosition = checkPageEnd(doc, yPosition, blockHeight);
        doc.text(lines, margin, yPosition);
        yPosition += blockHeight;
      });

      // Información del Beneficiario
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 10;
      doc.text("Información del Beneficiario", margin, yPosition);

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      const tipoDocumento = getColumnDisplayValue("Tipo de documento", caracterizacionData["Tipo de documento"]);
      const numeroDocumento = caracterizacionData["Numero de documento de identificacion ciudadano"] || 'No disponible';

      yPosition += 20;
      const infoEmprendedor = [
        `Nombre beneficiario: ${emprendedorNombre}`,
        `Tipo documento identidad: ${tipoDocumento || 'No disponible'}`,
        `Número documento identidad: ${numeroDocumento}`,
      ];

      infoEmprendedor.forEach(text => {
        const lines = doc.splitTextToSize(text, maxLineWidth);
        const blockHeight = lines.length * 12;
        yPosition = checkPageEnd(doc, yPosition, blockHeight);
        doc.text(lines, margin, yPosition);
        yPosition += blockHeight;
      });

      // Plan de Inversión
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      yPosition += 20;

      // Asegurar que hay espacio antes de dibujar el título y el rectángulo
      yPosition = checkPageEnd(doc, yPosition, 25);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
      doc.text("Plan de Inversión", pageWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += 40;

      // Datos de pi_datos
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

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

        // Texto en negrita para el label
        doc.setFont(undefined, 'bold');
        const labelLines = doc.splitTextToSize(label, maxLineWidth);
        const labelHeight = labelLines.length * 12;
        yPosition = checkPageEnd(doc, yPosition, labelHeight);
        doc.text(labelLines, margin, yPosition);
        yPosition += labelHeight;

        // Salto de línea y texto normal para el valor
        doc.setFont(undefined, 'normal');
        const valueLines = doc.splitTextToSize(value, maxLineWidth);
        const valueHeight = valueLines.length * 12 + 5; // Espacio adicional entre entradas
        yPosition = checkPageEnd(doc, yPosition, valueHeight);
        doc.text(valueLines, margin, yPosition);
        yPosition += valueHeight;
      });

      // DIAGNÓSTICO DEL NEGOCIO Y PROPUESTA DE MEJORA
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      yPosition += 20;

      // Asegurar que hay espacio antes de dibujar el título y el rectángulo
      yPosition = checkPageEnd(doc, yPosition, 25);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
      doc.text("Diagnóstico del Negocio y Propuesta de Mejora", pageWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += 30;

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
        styles: { fontSize: fontSizes.normal, cellPadding: 4, overflow: 'linebreak' },
        tableWidth: 'auto',
        headStyles: {
          fillColor: blueColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          yPosition = data.cursor.y;
        },
        pageBreak: 'auto',
      });

      yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

      // DESCRIPCIÓN ACTIVOS ACTUALES
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      yPosition += 20;

      // Asegurar que hay espacio antes de dibujar el título y el rectángulo
      yPosition = checkPageEnd(doc, yPosition, 25);

      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
      doc.text("Descripción de Activos Actuales", pageWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += 30;

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

      // Solución al problema del recuadro negro
      doc.autoTable({
        startY: yPosition,
        head: [activosColumns.map(col => col.header)],
        body: activosTableData.map(row => activosColumns.map(col => row[col.dataKey])),
        theme: 'striped',
        styles: {
          fontSize: fontSizes.normal,
          cellPadding: 4,
          overflow: 'linebreak',
          fillColor: null, // Evitar relleno en celdas para prevenir recuadro negro
        },
        tableWidth: 'auto',
        headStyles: {
          fillColor: blueColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        margin: { left: margin, right: margin },
        pageBreak: 'auto',
        willDrawCell: (data) => {
          if (data.section === 'head') {
            data.cell.styles.fillColor = blueColor; // Aplicar color solo al encabezado
          } else {
            data.cell.styles.fillColor = null; // Sin color de relleno en celdas de datos
          }
        },
      });

      yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

      // DESCRIPCIÓN DE LAS CARACTERÍSTICAS DEL ESPACIO
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');

      // Ajustar el título largo (separarlo en dos líneas)
      const tituloCaracteristicas = "Descripción de las Características del Espacio Disponible para la Instalación y/o Utilización de los Bienes";
      const tituloCaracteristicasLines = doc.splitTextToSize(tituloCaracteristicas, maxLineWidth);

      const tituloHeight = tituloCaracteristicasLines.length * 12 + 10;

      // Asegurar que hay espacio antes de dibujar el título y el rectángulo
      yPosition = checkPageEnd(doc, yPosition, tituloHeight);

      doc.rect(margin, yPosition, maxLineWidth, tituloHeight, 'F');
      doc.text(tituloCaracteristicasLines, pageWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += tituloHeight + 5;

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

      // Solución al problema del recuadro negro
      doc.autoTable({
        startY: yPosition,
        head: [caracteristicasColumns.map(col => col.header)],
        body: caracteristicasTableData.map(row => caracteristicasColumns.map(col => row[col.dataKey])),
        theme: 'striped',
        styles: {
          fontSize: fontSizes.normal,
          cellPadding: 4,
          overflow: 'linebreak',
          fillColor: null,
        },
        tableWidth: 'auto',
        headStyles: {
          fillColor: blueColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        margin: { left: margin, right: margin },
        pageBreak: 'auto',
        willDrawCell: (data) => {
          if (data.section === 'head') {
            data.cell.styles.fillColor = blueColor;
          } else {
            data.cell.styles.fillColor = null;
          }
        },
      });

      yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

      // Productos Seleccionados
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      yPosition += 20;

      // Asegurar que hay espacio antes de dibujar el título y el rectángulo
      yPosition = checkPageEnd(doc, yPosition, 25);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
      doc.text("Descripción de las Necesidades de Inversión y Valor", pageWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += 30;

      const productosTableData = piFormulacionRecords.map((piRecord, index) => {
        const provider = piRecord.providerData;
        const cantidad = parseFloat(piRecord.Cantidad) || 1;
        const precioCatalogo = parseFloat(provider["Valor catalogo"]) || 0;
        const total = (precioCatalogo * cantidad).toFixed(2);

        const rubroName = getProviderColumnDisplayValue('Rubro', provider.Rubro);
        const elementoName = getProviderColumnDisplayValue('Elemento', provider.Elemento);

        return {
          index: index + 1,
          nombreProveedor: provider["Nombre proveedor"] || 'No disponible',
          rubro: rubroName || 'No disponible',
          elemento: elementoName || 'No disponible',
          descripcion: provider["Descripcion corta"] || 'No disponible',
          precioUnitario: provider["Valor catalogo"] || '0',
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
        styles: {
          fontSize: fontSizes.normal,
          cellPadding: 4,
          overflow: 'linebreak',
          fillColor: null,
        },
        tableWidth: 'auto',
        headStyles: {
          fillColor: blueColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        margin: { left: margin, right: margin },
        pageBreak: 'auto',
        willDrawCell: (data) => {
          if (data.section === 'head') {
            data.cell.styles.fillColor = blueColor;
          } else {
            data.cell.styles.fillColor = null;
          }
        },
      });

      yPosition = doc.lastAutoTable.finalY + 20 || yPosition + 20;

      // Resumen de la Inversión
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      yPosition += 20;

      // Asegurar que hay espacio antes de dibujar el título y el rectángulo
      yPosition = checkPageEnd(doc, yPosition, 25);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, maxLineWidth, 25, 'F');
      doc.text("Resumen de la Inversión", pageWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += 30;

      const resumenColumns = [
        { header: 'Rubro', dataKey: 'rubro' },
        { header: 'Valor', dataKey: 'total' },
      ];

      doc.autoTable({
        startY: yPosition,
        head: [resumenColumns.map(col => col.header)],
        body: groupedRubros.map(row => resumenColumns.map(col => row[col.dataKey])),
        theme: 'striped',
        styles: {
          fontSize: fontSizes.normal,
          cellPadding: 4,
          fillColor: null,
        },
        tableWidth: 'auto',
        headStyles: {
          fillColor: blueColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        margin: { left: margin, right: margin },
        pageBreak: 'auto',
        willDrawCell: (data) => {
          if (data.section === 'head') {
            data.cell.styles.fillColor = blueColor;
          } else {
            data.cell.styles.fillColor = null;
          }
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'normal');
      yPosition = checkPageEnd(doc, yPosition, 20);
      doc.text(`Total Inversión: $${totalInversion}`, pageWidth - margin, yPosition, { align: 'right' });

      yPosition += 30;
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      const conceptoHeader = "Concepto de Viabilidad";
      yPosition = checkPageEnd(doc, yPosition, 25);
      doc.text(conceptoHeader, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 20;
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

      // Texto de la sección CONCEPTO DE VIABILIDAD
      const textoViabilidad = [
        `Yo, ${asesorNombre}, identificado con documento de identidad ${asesorDocumento}, en mi calidad de asesor empresarial del micronegocio denominado ${nombreComercial} y haciendo parte del equipo ejecutor del programa “Impulso Capital” suscrito entre la Corporación para el Desarrollo de las Microempresas - Propaís y la Secretaría de Desarrollo Económico - SDDE, emito concepto de VIABILIDAD para que el beneficiario pueda acceder a los recursos de capitalización proporcionados por el citado programa.`,
        "",
        "Nota: El valor detallado en el presente documento corresponde a la planeación de las inversiones que requiere cada negocio local, sin embargo, es preciso aclarar que el programa Impulso Capital no capitalizará este valor en su totalidad, sino que fortalecerá cada unidad productiva con algunos de estos bienes hasta por $3.000.000 de pesos en total, de acuerdo con la disponibilidad de los mismos y la mayor eficiencia en el uso de los recursos públicos.",
        "",
        "Nota: Declaro que toda la información sobre el plan de inversión aquí consignada fue diligenciada en conjunto con el asesor empresarial a cargo, está de acuerdo con las condiciones del negocio, es verdadera, completa y correcta, la cual puede ser verificada en cualquier momento."
      ];

      textoViabilidad.forEach(parrafo => {
        const lines = doc.splitTextToSize(parrafo, maxLineWidth);
        const parrafoHeight = lines.length * 12 + 10;
        yPosition = checkPageEnd(doc, yPosition, parrafoHeight);
        doc.text(lines, margin, yPosition);
        yPosition += parrafoHeight;
      });

      // Calcular altura necesaria para la sección de firmas
      const boxWidth = 150;
      const boxHeight = 40;
      const firmasSectionHeight = 20 + 30 + 10 + boxHeight + 15 + 15; // Total estimado

      yPosition = checkPageEnd(doc, yPosition, firmasSectionHeight);

      yPosition += 20;
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      doc.text("Firmas", pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 30;
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

      const beneficiarioBoxX = margin + 30;
      const asesorBoxX = pageWidth - margin - 180;

      // Posicionar etiquetas directamente encima de las cajas
      doc.text("Beneficiario", beneficiarioBoxX + boxWidth / 2, yPosition, { align: 'center' });
      doc.text("Asesor", asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;

      // Dibujar cajas de firmas
      doc.rect(beneficiarioBoxX, yPosition, boxWidth, boxHeight);
      doc.rect(asesorBoxX, yPosition, boxWidth, boxHeight);

      yPosition += boxHeight + 15;

      // Nombres debajo de las cajas
      doc.text(emprendedorNombre, beneficiarioBoxX + 10, yPosition);
      doc.text(asesorNombre, asesorBoxX + 10, yPosition);

      yPosition += 15;
      const emprendedorCC = caracterizacionData["Numero de documento de identificacion ciudadano"] || 'No disponible';
      doc.text(`C.C. ${emprendedorCC}`, beneficiarioBoxX + 10, yPosition);
      doc.text(`C.C. ${asesorDocumento}`, asesorBoxX + 10, yPosition);

      // Calcular altura necesaria para la sección de fecha y hora
      const dateSectionHeight = 40 + 15 + 15; // Total estimado

      yPosition = checkPageEnd(doc, yPosition, dateSectionHeight);

      yPosition += 40;
      const fecha = new Date();
      doc.text(`Fecha y hora de generación`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      doc.text(fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString(), pageWidth / 2, yPosition, { align: 'center' });

      // Descargar PDF
      doc.save('Informe_Negocio_Local.pdf');
    };
  };

  // Función para verificar el final de la página y agregar una nueva si es necesario
  const checkPageEnd = (doc, currentY, addedHeight) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 40; // Margen inferior
    if (currentY + addedHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 40; // Reiniciamos yPosition al margen superior después de agregar una nueva página
    }
    return currentY;
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









