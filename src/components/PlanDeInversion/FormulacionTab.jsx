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
  const [piFormulacionRecords, setPiFormulacionRecords] = useState([]);
  const tableName = 'provider_proveedores';
  const rubroTableName = 'provider_rubro';
  const elementoTableName = 'provider_elemento';
  const piFormulacionTableName = 'pi_formulacion';

  const displayedFieldNames = [
    "Nombre proveedor",
    "Rubro",
    "Elemento",
    "Descripcion corta",
    "Valor catalogo",
    "Precio",
    "Puntuacion evaluacion"
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
        let recordsUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/records?Rubro=${selectedRubro}`;
        if (selectedElemento) {
          recordsUrl += `&Elemento=${selectedElemento}`;
        }

        const recordsResponse = await axios.get(recordsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const sortedRecords = recordsResponse.data.sort(
          (a, b) => b["Puntuacion evaluacion"] - a["Puntuacion evaluacion"]
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
  }, [selectedRubro, selectedElemento]);

  // Hook para obtener los registros de pi_formulacion y los proveedores asociados
  useEffect(() => {
    const fetchPiFormulacionRecords = async () => {
      try {
        const token = localStorage.getItem('token');
        const piFormulacionUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/records?caracterizacion_id=${id}`;
        const response = await axios.get(piFormulacionUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const piRecords = response.data;

        // Obtener los IDs de proveedores
        const providerIds = piRecords.map((piRecord) => piRecord.rel_id_prov);

        // Obtener detalles de los proveedores
        const providerPromises = providerIds.map((providerId) => {
          const providerUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${providerId}`;
          return axios.get(providerUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
        });

        const providersResponses = await Promise.all(providerPromises);
        const providersData = providersResponses.map((res) => res.data.record);

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
      } catch (error) {
        console.error('Error obteniendo los registros de pi_formulacion:', error);
      }
    };

    if (id) {
      fetchPiFormulacionRecords();
    }
  }, [id]);

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
    const elemento = elementos.find((el) => String(el.id) === String(elementoId));
    return elemento ? elemento["Descripcion"] || elemento["Elemento"] || elemento["Descripcion corta"] : 'Desconocido';
  };

  // Función para obtener el nombre del Rubro
  const getRubroName = (rubroId) => {
    const rubro = rubros.find((r) => String(r.id) === String(rubroId));
    return rubro ? rubro.Rubro : 'Desconocido';
  };

  // Función para obtener datos de pi_formulacion para un proveedor
  const getPiFormulacionData = (recordId) => {
    return piFormulacionRecords.find(
      (piRecord) => String(piRecord.rel_id_prov) === String(recordId)
    ) || {};
  };

  // Función para manejar cambios en la cantidad
  const handleCantidadChange = async (recordId, cantidad) => {
    try {
      const token = localStorage.getItem('token');
      const existingPiData = getPiFormulacionData(recordId);

      const recordData = {
        caracterizacion_id: id,
        rel_id_prov: recordId,
        Cantidad: cantidad,
      };

      const endpoint = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/record`;

      if (existingPiData.id) {
        // Actualizar registro existente
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Crear nuevo registro
        await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Actualizar estado
      setPiFormulacionRecords((prevRecords) => {
        const index = prevRecords.findIndex(
          (rec) => String(rec.rel_id_prov) === String(recordId)
        );
        if (index !== -1) {
          const updatedRecord = { ...prevRecords[index], Cantidad: cantidad };
          return [
            ...prevRecords.slice(0, index),
            updatedRecord,
            ...prevRecords.slice(index + 1),
          ];
        } else {
          // Necesitamos obtener los datos del proveedor
          const providerUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`;
          axios.get(providerUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => {
            const providerData = res.data.record;
            setPiFormulacionRecords((prev) => [
              ...prev,
              { ...recordData, providerData },
            ]);
          });
          return prevRecords;
        }
      });
    } catch (error) {
      console.error('Error al cambiar la cantidad:', error);
    }
  };

  // Función para manejar cambios en la aprobación
  const handleApprovalChange = async (record, field, value) => {
    try {
      const token = localStorage.getItem('token');
      const existingPiData = getPiFormulacionData(record.id);

      const recordData = {
        caracterizacion_id: id,
        rel_id_prov: record.id,
        [field]: value,
      };

      const endpoint = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/record`;

      if (existingPiData.id) {
        // Actualizar registro existente
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Crear nuevo registro
        await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Actualizar estado
      setPiFormulacionRecords((prevRecords) => {
        const index = prevRecords.findIndex(
          (rec) => String(rec.rel_id_prov) === String(record.id)
        );
        if (index !== -1) {
          const updatedRecord = { ...prevRecords[index], [field]: value };
          return [
            ...prevRecords.slice(0, index),
            updatedRecord,
            ...prevRecords.slice(index + 1),
          ];
        } else {
          // Necesitamos obtener los datos del proveedor
          const providerUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${record.id}`;
          axios.get(providerUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => {
            const providerData = res.data.record;
            setPiFormulacionRecords((prev) => [
              ...prev,
              { ...recordData, providerData },
            ]);
          });
          return prevRecords;
        }
      });
    } catch (error) {
      console.error('Error al cambiar la aprobación:', error);
    }
  };

  // Agrupar Rubros y sumar los Valores
  const groupedRubros = useMemo(() => {
    const rubroMap = {};

    piFormulacionRecords.forEach((piRecord) => {
      if (piRecord["Seleccion"]) {
        const provider = piRecord.providerData;
        if (provider) {
          const rubroName = getRubroName(provider.Rubro);
          const precio = parseFloat(provider.Precio) || 0;
          const cantidad = parseFloat(piRecord.Cantidad) || 1;
          const totalPrice = precio * cantidad;

          if (rubroMap[rubroName]) {
            rubroMap[rubroName] += totalPrice;
          } else {
            rubroMap[rubroName] = totalPrice;
          }
        }
      }
    });

    return Object.entries(rubroMap).map(([rubro, total]) => ({
      rubro,
      total: total.toFixed(2),
    }));
  }, [piFormulacionRecords]);

  // Calcular el total de la inversión a partir de los rubros agrupados
  const totalInversion = groupedRubros.reduce(
    (acc, record) => acc + parseFloat(record.total || 0),
    0
  ).toFixed(2);

  // Obtener registros seleccionados
  const selectedRecords = piFormulacionRecords.filter(
    (piRecord) => piRecord["Seleccion"]
  );

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
              {elementos
                .filter((el) => {
                  // Asegúrate de que el campo que relaciona el elemento con el rubro es el correcto
                  return (
                    String(el.Rubro) === String(selectedRubro) ||
                    String(el.Rubro_id) === String(selectedRubro) ||
                    String(el.rubro_id) === String(selectedRubro) ||
                    String(el.id_rubro) === String(selectedRubro)
                  );
                })
                .map((elemento) => (
                  <option key={elemento.id} value={elemento.id}>
                    {elemento["Descripcion"] || elemento["Elemento"] || elemento["Descripcion corta"] || elemento["Nombre"]}
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
                <th>Cantidad</th>
                <th>Pre-selección</th>
                <th>Selección</th>
                <th>Aprobación Comité</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((record) => {
                  const piData = getPiFormulacionData(record.id);

                  return (
                    <tr key={record.id}>
                      {fields.map((field) => (
                        <td key={field.column_name}>
                          {field.column_name === 'Elemento'
                            ? getElementoName(record.Elemento)
                            : field.column_name === 'Rubro'
                            ? getRubroName(record.Rubro)
                            : record[field.column_name]}
                        </td>
                      ))}
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={piData.Cantidad || 1}
                          onChange={(e) =>
                            handleCantidadChange(record.id, e.target.value)
                          }
                          style={{ width: '60px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={piData["pre-Seleccion"] || false}
                          onChange={(e) =>
                            handleApprovalChange(
                              record,
                              "pre-Seleccion",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={piData["Seleccion"] || false}
                          onChange={(e) =>
                            handleApprovalChange(
                              record,
                              "Seleccion",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={piData["Aprobación comité"] || false}
                          onChange={(e) =>
                            handleApprovalChange(
                              record,
                              "Aprobación comité",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={fields.length + 4} className="text-center">
                    No hay coincidencias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4">
            <h5>Productos Seleccionados</h5>
            {selectedRecords.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre proveedor</th>
                    <th>Rubro</th>
                    <th>Elemento</th>
                    <th>Descripción</th>
                    <th>Precio Unitario</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.map((piRecord) => {
                    const provider = piRecord.providerData;
                    if (!provider) return null;

                    const cantidad = parseFloat(piRecord.Cantidad) || 1;
                    const precio = parseFloat(provider.Precio) || 0;
                    const total = (precio * cantidad).toFixed(2);

                    return (
                      <tr key={piRecord.rel_id_prov}>
                        <td>{provider["Nombre proveedor"]}</td>
                        <td>{getRubroName(provider.Rubro)}</td>
                        <td>{getElementoName(provider.Elemento)}</td>
                        <td>{provider["Descripcion corta"]}</td>
                        <td>{provider.Precio}</td>
                        <td>{cantidad}</td>
                        <td>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No hay productos seleccionados.</p>
            )}
          </div>

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
              <p>No hay productos seleccionados para inversión.</p>
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

