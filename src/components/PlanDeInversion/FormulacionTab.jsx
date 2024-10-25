import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function FormulacionTab({ id }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [selectedRubro, setSelectedRubro] = useState('');
  const [elementos, setElementos] = useState([]);
  const [selectedElemento, setSelectedElemento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approvedRecords, setApprovedRecords] = useState([]);
  const tableName = 'provider_proveedores';
  const rubroTableName = 'provider_rubro';
  const elementoTableName = 'provider_elemento';
  const piFormulacionTableName = 'pi_formulacion';

  const displayedFieldNames = [
    "id",
    "Nombre Proveedor",
    "Elemento",
    "Precio",
    "Valor Catalogo y/o referencia",
    "Calificacion",
    "Descripción producto"
  ];

  // Hook para obtener los campos y datos iniciales
  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontró el token de autenticación.');
        }

        const fieldsUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/fields`;
        const rubrosUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${rubroTableName}/records`;
        const elementosUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${elementoTableName}/records`;

        const [fieldsResponse, rubrosResponse, elementosResponse] = await Promise.all([
          axios.get(fieldsUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(rubrosUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(elementosUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const filteredFields = fieldsResponse.data.filter((field) =>
          displayedFieldNames.includes(field.column_name)
        );
        setFields(filteredFields);
        setRubros(rubrosResponse.data);
        setElementos(elementosResponse.data);

        console.log('Rubros cargados:', rubrosResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError(
          error.response?.data?.message || 'Error obteniendo los campos o datos'
        );
        setLoading(false);
      }
    };

    fetchFieldsAndData();
  }, []);

  // Hook para obtener los registros basados en Rubro y Elemento
  useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedRubro) {
        setRecords([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        let recordsUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/records?caracterizacion_id=${id}&Rubro=${selectedRubro}`;
        if (selectedElemento) {
          recordsUrl += `&Elemento=${selectedElemento}`;
        }

        const recordsResponse = await axios.get(recordsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const sortedRecords = recordsResponse.data.sort(
          (a, b) => b.Calificacion - a.Calificacion
        );
        const topThreeRecords = sortedRecords.slice(0, 3);

        setRecords(topThreeRecords);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los registros:', error);
        setError(
          error.response?.data?.message || 'Error obteniendo los registros'
        );
        setLoading(false);
      }
    };

    fetchRecords();
  }, [id, selectedRubro, selectedElemento]);

  // Hook para obtener los registros aprobados y enriquecerlos con datos del proveedor
  useEffect(() => {
    const fetchApprovedRecords = async () => {
      // Asegurarse de que 'rubros' esté cargado
      if (rubros.length === 0) {
        console.log('Rubros aún no están cargados. Esperando...');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const approvedUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/records?caracterizacion_id=${id}&Aprobación comité=true`;
        console.log('Fetching approved records:', approvedUrl);

        const response = await axios.get(approvedUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Approved records fetched:', response.data);

        // Obtener los detalles del proveedor para cada registro aprobado.
        const enrichedRecords = await Promise.all(
          response.data.map(async (record) => {
            try {
              const providerUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${record.rel_id_prov}`;
              console.log('Fetching provider details:', providerUrl);

              const providerResponse = await axios.get(providerUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });

              console.log('Provider details fetched:', providerResponse.data);

              // Ajustar según la estructura real de providerResponse.data
              const providerData = providerResponse.data.record || providerResponse.data;
              console.log('Provider data:', providerData);

              const rubroId = providerData?.Rubro;
              const precio = providerData?.Precio || 0;

              // Obtener el nombre del rubro usando la función getRubroNameById
              const rubro = getRubroNameById(rubroId) || 'Desconocido';

              // Log para verificar los datos extraídos
              console.log(`Rubro: ${rubro}, Precio: ${precio} para rel_id_prov: ${record.rel_id_prov}`);

              return {
                ...record,
                Rubro: rubro,
                Precio: precio,
              };
            } catch (error) {
              console.error('Error obteniendo detalles del proveedor:', error);
              return {
                ...record,
                Rubro: 'Desconocido',
                Precio: 0,
              };
            }
          })
        );

        console.log('Enriched records:', enrichedRecords);
        setApprovedRecords(enrichedRecords);
      } catch (error) {
        console.error('Error obteniendo los registros aprobados:', error);
      }
    };

    fetchApprovedRecords();
  }, [id, rubros]); // Asegurarse de que 'rubros' esté en las dependencias

  // Función para manejar cambios en el Rubro seleccionado
  const handleRubroChange = (e) => {
    setSelectedRubro(e.target.value);
    setSelectedElemento('');
  };

  // Función para manejar cambios en el Elemento seleccionado
  const handleElementoChange = (e) => {
    setSelectedElemento(e.target.value);
  };

  // Función para obtener el nombre del Elemento
  const getElementoName = (elementoId) => {
    const elemento = elementos.find((el) => el.id === elementoId);
    return elemento ? elemento.Elemento : 'Desconocido';
  };

  // Función para manejar cambios en la aprobación
  const handleApprovalChange = async (record, field, value) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/record`;
      const recordData = {
        caracterizacion_id: id,
        rel_id_prov: record.id,
        [field]: value,
      };

      await axios.post(endpoint, recordData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (field === "Aprobación comité") {
        setApprovedRecords((prevRecords) =>
          value
            ? [...prevRecords, { ...record, "Aprobación comité": true }]
            : prevRecords.filter((rec) => rec.rel_id_prov !== record.rel_id_prov)
        );
      }

      setRecords((prevRecords) =>
        prevRecords.map((rec) =>
          rec.id === record.id ? { ...rec, [field]: value } : rec
        )
      );
    } catch (error) {
      console.error('Error al cambiar la aprobación:', error);
    }
  };

  // Función para obtener el nombre del Rubro por su ID
  const getRubroNameById = (rubroId) => {
    const rubro = rubros.find((r) => String(r.id) === String(rubroId));
    return rubro ? rubro.Rubro : 'Desconocido';
  };

  // Agrupar Rubros y sumar los Valores
  const groupedRubros = useMemo(() => {
    const rubroMap = {};

    approvedRecords.forEach(record => {
      const rubro = record.Rubro;
      const precio = parseFloat(record.Precio) || 0;

      if (rubroMap[rubro]) {
        rubroMap[rubro] += precio;
      } else {
        rubroMap[rubro] = precio;
      }
    });

    // Convertir el mapa a un array de objetos
    return Object.entries(rubroMap).map(([rubro, total]) => ({
      rubro,
      total: total.toFixed(2) // Opcional: Formatear a 2 decimales
    }));
  }, [approvedRecords]);

  // Calcular el total de la inversión a partir de los rubros agrupados
  const totalInversion = groupedRubros.reduce(
    (acc, record) => acc + parseFloat(record.total || 0),
    0
  ).toFixed(2);

  return (
    <div>
      <h3>Formulación</h3>
      {loading ? (
        <p>Cargando datos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <div className="form-group">
            <label>Rubro</label>
            <select
              className="form-control"
              value={selectedRubro}
              onChange={handleRubroChange}
            >
              <option value="">-- Selecciona un rubro --</option>
              {rubros.map((rubro) => (
                <option key={rubro.id} value={rubro.id}>
                  {rubro.Rubro}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group mt-3">
            <label>Elemento</label>
            <select
              className="form-control"
              value={selectedElemento}
              onChange={handleElementoChange}
              disabled={!selectedRubro}
            >
              <option value="">-- Selecciona un elemento --</option>
              {elementos.map((elemento) => (
                <option key={elemento.id} value={elemento.id}>
                  {elemento.Elemento}
                </option>
              ))}
            </select>
          </div>

          <table className="table mt-3">
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field.column_name}>
                    {field.column_name.replace('_', ' ')}
                  </th>
                ))}
                <th>Pre-selección</th>
                <th>Aprobación Comité</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((record) => (
                  <tr
                    key={record.id}
                    style={{
                      backgroundColor: record["Aprobación comité"]
                        ? '#d4edda'
                        : 'transparent',
                    }}
                  >
                    {fields.map((field) => (
                      <td key={field.column_name}>
                        {field.column_name === 'Elemento'
                          ? getElementoName(record.Elemento)
                          : record[field.column_name]}
                      </td>
                    ))}
                    <td>
                      <input
                        type="checkbox"
                        checked={record["pre-Selección"] || false}
                        onChange={(e) =>
                          handleApprovalChange(
                            record,
                            "pre-Selección",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={record["Aprobación comité"] || false}
                        onChange={(e) =>
                          handleApprovalChange(
                            record,
                            "Aprobación comité",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                    <td>
                      <button className="btn btn-secondary">Ver</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={fields.length + 3} className="text-center">
                    No hay coincidencias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4">
            <h5>Resumen de la Inversión</h5>
            {groupedRubros.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Rubro</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRubros.map((record) => (
                    <tr key={record.rubro}>
                      <td>{record.rubro}</td>
                      <td>{record.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{totalInversion}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p>No hay productos aprobados para el comité.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

FormulacionTab.propTypes = {
  id: PropTypes.string.isRequired,
};

