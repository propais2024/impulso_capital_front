// DynamicRecordEdit.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/DynamicRecordEdit.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function DynamicRecordEdit() {
  const { tableName, recordId } = useParams();
  const [record, setRecord] = useState({});
  const [fields, setFields] = useState([]);
  const [relatedData, setRelatedData] = useState({});
  const [isPrimaryTable, setIsPrimaryTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Estado para 'Calificacion'
  const [calificacion, setCalificacion] = useState(0);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Estado y funciones para el modal de cambiar estado
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [estadoOptions, setEstadoOptions] = useState([]);

  // Añadimos currentEstado como estado
  const [currentEstado, setCurrentEstado] = useState(null);

  // Añadimos estado para verificar si el campo 'Estado' existe en la tabla actual
  const [estadoFieldExists, setEstadoFieldExists] = useState(false);

  const handleOpenStatusModal = () => {
    setNewStatus(record.Estado || '');
    setShowStatusModal(true);
    // No es necesario volver a cargar estadoOptions aquí
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
  };

  const handleUpdateStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`,
        { ...record, Estado: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRecord({ ...record, Estado: newStatus });
      setShowStatusModal(false);
    } catch (error) {
      console.error('Error actualizando el estado:', error);
      setError('Error actualizando el estado');
    }
  };

  // Obtener el registro a editar, los campos de la tabla y las opciones de estado
  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Obtener campos de la tabla
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/fields`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Verificar si el campo 'Estado' existe en la tabla
        const estadoField = fieldsResponse.data.find(
          (field) => field.column_name === 'Estado'
        );
        const estadoExists = !!estadoField;
        setEstadoFieldExists(estadoExists);

        // Excluir el campo 'Estado' de los campos a mostrar en el formulario si existe
        const filteredFields = estadoExists
          ? fieldsResponse.data.filter((field) => field.column_name !== 'Estado')
          : fieldsResponse.data;
        setFields(filteredFields);

        // Obtener el registro y los datos relacionados de claves foráneas
        const recordResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setRecord(recordResponse.data.record);
        setRelatedData(recordResponse.data.relatedData);

        // Si el campo 'Estado' existe, obtener las opciones y el estado actual
        if (estadoExists) {
          // Obtener las opciones de estado
          const estadoOptionsResponse = await axios.get(
            `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/field-options/Estado`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setEstadoOptions(estadoOptionsResponse.data.options);

          // Establecer el estado actual basado en las opciones y el valor del registro
          const current = estadoOptionsResponse.data.options.find(
            (option) => option.value.toString() === recordResponse.data.record.Estado?.toString()
          );
          setCurrentEstado(current);
        } else {
          // Si el campo 'Estado' no existe, aseguramos que estadoOptions y currentEstado estén vacíos
          setEstadoOptions([]);
          setCurrentEstado(null);
        }

        // Obtener is_primary de la tabla seleccionada
        // Modificación para incluir tablas de proveedores
        const inscriptionsResponse = await axios.get(
          'https://impulso-capital-back.onrender.com/api/inscriptions/tables?tableType=inscription',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const providersResponse = await axios.get(
          'https://impulso-capital-back.onrender.com/api/inscriptions/tables?tableType=provider',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const tables = [...(inscriptionsResponse.data || []), ...(providersResponse.data || [])];
        const selectedTableObj = tables.find((table) => table.table_name === tableName);
        setIsPrimaryTable(selectedTableObj?.is_primary || false);

        // Obtener archivos subidos asociados al registro
        const filesResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/files`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUploadedFiles(filesResponse.data.files);

        // Obtener el valor de 'Calificacion' del registro
        const calificacionValue = recordResponse.data.record.Calificacion;
        if (calificacionValue !== undefined && calificacionValue !== null) {
          // Si 'Calificacion' está en un rango diferente a 0-100, ajusta aquí
          setCalificacion(Number(calificacionValue));
        } else {
          setCalificacion(0);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los datos:', error);
        setError('Error obteniendo los datos');
        setLoading(false);
      }
    };

    fetchRecordData();
  }, [tableName, recordId]);

  // Actualizar currentEstado cuando record.Estado o estadoOptions cambien
  useEffect(() => {
    if (estadoFieldExists && estadoOptions.length > 0) {
      const current = estadoOptions.find(
        (option) => option.value.toString() === record.Estado?.toString()
      );
      setCurrentEstado(current);
    } else {
      setCurrentEstado(null);
    }
  }, [record.Estado, estadoOptions, estadoFieldExists]);

  // Calcular el porcentaje de campos completados
  useEffect(() => {
    if (fields.length > 0) {
      let totalFields = fields.length;
      let filledFields = 0;

      fields.forEach((field) => {
        const fieldName = field.column_name;
        if (record[fieldName] && record[fieldName] !== '') {
          filledFields += 1;
        }
      });

      const percentage = Math.round((filledFields / totalFields) * 100);
      setCompletionPercentage(percentage);
    }
  }, [fields, record]);

  const handleChange = (e) => {
    setRecord({ ...record, [e.target.name]: e.target.value });

    // Si se cambia el campo 'Calificacion', actualizar el estado 'calificacion'
    if (e.target.name === 'Calificacion') {
      setCalificacion(Number(e.target.value));
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileNameChange = (e) => {
    setFileName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      await axios.put(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`,
        record,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      navigate(`/table/${tableName}`);
    } catch (error) {
      console.error('Error actualizando el registro:', error);
      setError('Error actualizando el registro');
    }
  };

  // Función para manejar la subida de archivos
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !fileName) {
      alert('Por favor, ingresa un nombre y selecciona un archivo');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);

      await axios.post(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Actualizar la lista de archivos subidos
      const filesResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUploadedFiles(filesResponse.data.files);

      // Limpiar los campos y ocultar el formulario
      setFile(null);
      setFileName('');
      setShowUploadForm(false);
    } catch (error) {
      console.error('Error subiendo el archivo:', error);
      setError('Error subiendo el archivo');
    }
  };

  // Función para eliminar un archivo
  const handleFileDelete = async (fileId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/file/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Actualizar la lista de archivos después de la eliminación
        const filesResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/files`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUploadedFiles(filesResponse.data.files);
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };

  // Determinar el estilo del cuadro de estado según el estado actual
  const estadoStyle = {
    padding: '10px',
    borderRadius: '5px',
    color: '#fff',
    textAlign: 'center',
    marginBottom: '10px',
    backgroundColor: currentEstado?.label === 'En Formulación' ? '#28a745' : '#6c757d',
  };

  return (
    <div className="content-wrapper">
      {/* Modal para Cambiar Estado */}
      {showStatusModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cambiar Estado</h5>
                <button type="button" className="close" onClick={handleCloseStatusModal}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {estadoOptions.length > 0 ? (
                  <div className="form-group">
                    <label>Selecciona el nuevo estado:</label>
                    <select
                      className="form-control"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="">-- Selecciona un estado --</option>
                      {estadoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p>Cargando opciones...</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseStatusModal}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleUpdateStatus}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para el modal */}
      {showStatusModal && <div className="modal-backdrop fade show"></div>}

      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Editar Registro</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <div className="row">
              {/* Columna izquierda */}
              <div className={isPrimaryTable ? 'col-md-8' : 'col-md-12'}>
                <form onSubmit={handleSubmit}>
                  {fields.map((field) => (
                    <div className="form-group" key={field.column_name}>
                      <label>{field.column_name}</label>

                      {/* Si el campo tiene datos relacionados, mostrar un select */}
                      {relatedData[field.column_name] ? (
                        <select
                          className="form-control"
                          name={field.column_name}
                          value={record[field.column_name] || ''}
                          onChange={handleChange}
                        >
                          <option value="">-- Selecciona una opción --</option>
                          {relatedData[field.column_name]?.map((relatedRecord) => (
                            <option key={relatedRecord.id} value={relatedRecord.id}>
                              {relatedRecord.displayValue}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name={field.column_name}
                          value={record[field.column_name] || ''}
                          onChange={handleChange}
                          className="form-control"
                        />
                      )}
                    </div>
                  ))}

                  <button type="submit" className="btn btn-primary">
                    Guardar Cambios
                  </button>
                </form>
              </div>

              {/* Columna derecha si la tabla es principal */}
              {isPrimaryTable && (
                <div className="col-md-4 d-flex flex-column align-items-center">
                  {/* Mostrar barra de progreso según el tipo de tabla */}
                  {tableName.startsWith('provider_') ? (
                    <>
                      {/* Barra de progreso para 'Calificacion' */}
                      <div style={{ width: 150, marginBottom: '20px' }}>
                        <CircularProgressbar
                          value={calificacion}
                          text={`${calificacion}%`}
                          maxValue={100}
                          styles={buildStyles({
                            textSize: '16px',
                            pathColor: '#28a745',
                            textColor: '#000',
                            trailColor: '#d6d6d6',
                          })}
                        />
                      </div>
                      <div className="knob-label mt-2">Calificación</div>
                    </>
                  ) : (
                    <>
                      {/* Barra de progreso para 'Completado' */}
                      <div style={{ width: 150, marginBottom: '20px' }}>
                        <CircularProgressbar
                          value={completionPercentage}
                          text={`${completionPercentage}%`}
                          styles={buildStyles({
                            textSize: '16px',
                            pathColor: '#28a745',
                            textColor: '#000',
                            trailColor: '#d6d6d6',
                          })}
                        />
                      </div>
                      <div className="knob-label mt-2">Completado</div>
                    </>
                  )}

                  {/* Mostrar el estado actual solo si el campo 'Estado' existe */}
                  {estadoFieldExists && (
                    <div className="mt-4 text-center" style={{ width: '100%' }}>
                      <div style={estadoStyle}>
                        {currentEstado?.label || 'Sin estado'}
                      </div>
                      <button
                        className="btn btn-secondary btn-sm btn-block mt-2"
                        onClick={handleOpenStatusModal}
                      >
                        Cambiar estado
                      </button>
                    </div>
                  )}

                  {/* Sección de Archivos adicionales */}
                  <div className="mt-4" style={{ width: '100%' }}>
                    <h5>Archivos adicionales</h5>
                    {!showUploadForm && (
                      <button
                        className="btn btn-primary btn-sm btn-block mb-2"
                        onClick={() => setShowUploadForm(true)}
                      >
                        Subir documento
                      </button>
                    )}

                    {showUploadForm && (
                      <form onSubmit={handleFileUpload}>
                        <div className="form-group">
                          <label>Nombre del archivo</label>
                          <input
                            type="text"
                            className="form-control"
                            value={fileName}
                            onChange={handleFileNameChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>Seleccionar archivo</label>
                          <input type="file" className="form-control" onChange={handleFileChange} />
                        </div>
                        <button type="submit" className="btn btn-success btn-sm btn-block mb-2">
                          Cargar archivo
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm btn-block"
                          onClick={() => setShowUploadForm(false)}
                        >
                          Cancelar
                        </button>
                      </form>
                    )}

                    {/* Lista de archivos subidos */}
                    {uploadedFiles.length > 0 && (
                      <ul className="list-group mt-3">
                        {uploadedFiles.map((file) => (
                          <li
                            key={file.id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <strong>{file.name}</strong>
                              <br />
                              <a
                                href={`https://impulso-capital-back.onrender.com${file.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver archivo
                              </a>
                            </div>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleFileDelete(file.id)}
                            >
                              Eliminar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}




