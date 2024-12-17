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
  const [searchTerm, setSearchTerm] = useState('');
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
        setError(error.response?.data?.message || 'Error obteniendo los campos o datos');
        setLoading(false);
      }
    };

    fetchFieldsAndData();
  }, []);

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

        setRecords(recordsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los registros:', error);
        setError(error.response?.data?.message || 'Error obteniendo los registros');
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedRubro, selectedElemento]);

  useEffect(() => {
    const fetchPiFormulacionRecords = async () => {
      try {
        const token = localStorage.getItem('token');
        const piFormulacionUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/records?caracterizacion_id=${id}`;
        const response = await axios.get(piFormulacionUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const piRecords = response.data;

        const providerIds = piRecords.map((piRecord) => piRecord.rel_id_prov);

        const providerPromises = providerIds.map((providerId) => {
          const providerUrl = `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${providerId}`;
          return axios.get(providerUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
        });

        const providersResponses = await Promise.all(providerPromises);
        const providersData = providersResponses.map((res) => res.data.record);

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

  const handleRubroChange = (e) => {
    setSelectedRubro(e.target.value);
    setSelectedElemento('');
    setSearchTerm('');
  };

  const handleElementoChange = (e) => {
    setSelectedElemento(e.target.value);
    setSearchTerm('');
  };

  const getElementoName = (elementoId) => {
    const elemento = elementos.find((el) => String(el.id) === String(elementoId));
    return elemento ? elemento.Elemento : 'Desconocido';
  };

  const getRubroName = (rubroId) => {
    const rubro = rubros.find((r) => String(r.id) === String(rubroId));
    return rubro ? rubro.Rubro : 'Desconocido';
  };

  const getPiFormulacionData = (recordId) => {
    return piFormulacionRecords.find(
      (piRecord) => String(piRecord.rel_id_prov) === String(recordId)
    ) || {};
  };

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
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        recordData.id = res.data.id; 
      }

      setPiFormulacionRecords((prevRecords) => {
        const index = prevRecords.findIndex((rec) => String(rec.rel_id_prov) === String(recordId));
        if (index !== -1) {
          const updatedRecord = { ...prevRecords[index], Cantidad: cantidad };
          return [
            ...prevRecords.slice(0, index),
            updatedRecord,
            ...prevRecords.slice(index + 1),
          ];
        } else {
          axios.get(`https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`, {
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

  const handleApprovalChange = async (record, field, value) => {
    try {
      const token = localStorage.getItem('token');
      const existingPiData = getPiFormulacionData(record.id);

      const recordData = {
        caracterizacion_id: id,
        rel_id_prov: record.id,
        [field]: value,
      };

      if (field === "Seleccion") {
        if (value === true) {
          // Obtener todos los seleccionados
          const currentlySelected = piFormulacionRecords.filter(r => r.Seleccion);
          // Extraer sus selectionorder
          const occupiedOrders = currentlySelected
            .map(r => r.selectionorder)
            .filter(o => o !== null && o !== undefined);

          // Buscamos el primer número libre en {1,2,3}
          const possibleOrders = [1,2,3];
          const freeOrder = possibleOrders.find(order => !occupiedOrders.includes(order));

          if (!freeOrder) {
            console.log("Ya hay 3 productos seleccionados. No se puede seleccionar otro.");
            // No enviamos nada al backend. Revertimos el cambio en el checkbox.
            return; 
          }

          // Asignamos el order encontrado
          recordData.selectionorder = freeOrder;
        } else {
          // Si se deselecciona, se pone null
          recordData.selectionorder = null;
        }
      }

      const endpoint = `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${piFormulacionTableName}/record`;

      if (existingPiData.id) {
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        recordData.id = res.data.id;
      }

      setPiFormulacionRecords((prevRecords) => {
        const index = prevRecords.findIndex((rec) => String(rec.rel_id_prov) === String(record.id));
        let updatedRecords;

        if (index !== -1) {
          const updatedRecord = { ...prevRecords[index], [field]: value };

          if (field === "Seleccion") {
            if (value === true) {
              updatedRecord.selectionorder = recordData.selectionorder;
            } else {
              // Aquí el cambio: en lugar de borrar la propiedad, la establecemos en null.
              updatedRecord.selectionorder = null;
            }
          }

          updatedRecords = [
            ...prevRecords.slice(0, index),
            updatedRecord,
            ...prevRecords.slice(index + 1),
          ];
        } else {
          // Registro no existe en el estado, lo buscamos tras creación
          const newRecord = { ...recordData };
          axios.get(`https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${record.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => {
            const providerData = res.data.record;
            // Si es selección verdadera
            if (field === "Seleccion" && value === true) {
              newRecord.selectionorder = recordData.selectionorder;
            } else if (field === "Seleccion" && value === false) {
              // Si es falsa, aseguramos que selectionorder sea null
              newRecord.selectionorder = null;
            }

            setPiFormulacionRecords((prev) => [
              ...prev,
              { ...newRecord, providerData },
            ]);
          });
          updatedRecords = prevRecords;
        }
        return updatedRecords;
      });
    } catch (error) {
      console.error('Error al cambiar la aprobación:', error);
    }
  };

  const groupedRubros = useMemo(() => {
    const rubroMap = {};
    piFormulacionRecords.forEach((piRecord) => {
      if (piRecord["Seleccion"]) {
        const provider = piRecord.providerData;
        if (provider) {
          const rubroName = getRubroName(provider.Rubro);
          const precioCatalogo = parseFloat(provider["Valor catalogo"]) || 0;
          const cantidad = parseFloat(piRecord.Cantidad) || 1;
          const totalPrice = precioCatalogo * cantidad;

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
  }, [piFormulacionRecords, rubros]);

  const totalInversion = groupedRubros
    .reduce((acc, record) => acc + parseFloat(record.total || 0), 0)
    .toFixed(2);

  const selectedRecords = piFormulacionRecords
    .filter((piRecord) => piRecord["Seleccion"]);

  selectedRecords.sort((a, b) => {
    const orderA = a.selectionorder || Infinity;
    const orderB = b.selectionorder || Infinity;
    return orderA - orderB;
  });

  const filteredRecords = useMemo(() => {
    let filtered = records;
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const descripcionCorta = record['Descripcion corta'] || '';
        return descripcionCorta.toLowerCase().includes(lowercasedFilter);
      });
    }
    const sortedRecords = filtered.sort(
      (a, b) => b["Puntuacion evaluacion"] - a["Puntuacion evaluacion"]
    );
    return sortedRecords; 
  }, [records, searchTerm]);

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

          <div className="form-group mt-3">
            <label>Búsqueda por Descripción Corta</label>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!selectedRubro}
            />
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
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
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
                    const precioCatalogo = parseFloat(provider["Valor catalogo"]) || 0;
                    const total = (precioCatalogo * cantidad).toFixed(2);

                    return (
                      <tr key={piRecord.rel_id_prov}>
                        <td>{provider["Nombre proveedor"]}</td>
                        <td>{getRubroName(provider.Rubro)}</td>
                        <td>{getElementoName(provider.Elemento)}</td>
                        <td>{provider["Descripcion corta"]}</td>
                        <td>{provider["Valor catalogo"]}</td>
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
