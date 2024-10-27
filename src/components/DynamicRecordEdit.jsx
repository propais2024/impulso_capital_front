// DynamicRecordEdit.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/DynamicRecordEdit.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function DynamicRecordEdit() {
  const { tableName, recordId } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState({});
  const [fields, setFields] = useState([]);
  const [relatedData, setRelatedData] = useState({});
  const [isPrimaryTable, setIsPrimaryTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para 'Calificacion'
  const [calificacion, setCalificacion] = useState(0);

  // Estados para manejo de archivos
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Estado para porcentaje de completado
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Estado y funciones para el modal de cambiar estado
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [estadoOptions, setEstadoOptions] = useState([]);
  const [currentEstado, setCurrentEstado] = useState(null);
  const [estadoFieldExists, setEstadoFieldExists] = useState(false);

  // Estado para almacenar asesores
  const [asesors, setAsesors] = useState([]);

  // Funciones para manejar el modal de estado
  const handleOpenStatusModal = () => {
    setNewStatus(record.Estado || '');
    setShowStatusModal(true);
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

  // Obtener el registro a editar, los campos de la tabla, las opciones de estado y asesores
  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token usado para la solicitud:', token);

        // Obtener los campos de la tabla
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/fields`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log('Campos obtenidos de la tabla:', fieldsResponse.data);

        // Verificar si el campo 'Estado' existe
        const estadoField = fieldsResponse.data.find(
          (field) => field.column_name === 'Estado'
        );
        const estadoExists = !!estadoField;
        setEstadoFieldExists(estadoExists);

        // Filtrar los campos si 'Estado' existe
        const filteredFields = estadoExists
          ? fieldsResponse.data.filter((field) => field.column_name !== 'Estado')
          : fieldsResponse.data;
        setFields(filteredFields);

        // Obtener el registro específico
        const recordResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Registro obtenido:', recordResponse.data);

        setRecord(recordResponse.data.record);
        setRelatedData(recordResponse.data.relatedData);

        // Manejar el campo 'Estado' si existe
        if (estadoExists) {
          const estadoOptionsResponse = await axios.get(
            `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/field-options/Estado`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setEstadoOptions(estadoOptionsResponse.data.options);
          const current = estadoOptionsResponse.data.options.find(
            (option) =>
              option.value.toString() ===
              recordResponse.data.record.Estado?.toString()
          );
          setCurrentEstado(current);
        } else {
          setEstadoOptions([]);
          setCurrentEstado(null);
        }

        // Verificar si el campo 'Asesor' existe y obtener asesores si es necesario
        if (filteredFields.some(field => field.column_name === 'Asesor')) {
          console.log('El campo Asesor existe, solicitando asesores...');
          const asesorsResponse = await axios.get('https://impulso-capital-back.onrender.com/api/users/asesors', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          console.log('Asesores obtenidos:', asesorsResponse.data);
          setAsesors(asesorsResponse.data);
        }

        // Obtener otras tablas (inscripciones y proveedores)
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
        const tables = [
          ...(inscriptionsResponse.data || []),
          ...(providersResponse.data || []),
        ];
        const selectedTableObj = tables.find(
          (table) => table.table_name === tableName
        );
        setIsPrimaryTable(selectedTableObj?.is_primary || false);

        // Obtener archivos subidos
        const filesResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/files`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUploadedFiles(filesResponse.data.files);

        // Manejar 'Calificacion' si existe
        const calificacionValue = recordResponse.data.record.Calificacion;
        if (calificacionValue !== undefined && calificacionValue !== null) {
          setCalificacion(Number(calificacionValue));
        } else {
          setCalificacion(0);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los datos:', error);
        if (error.response) {
          console.error('Detalles del error:', error.response.data);
        }
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

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    setRecord({ ...record, [e.target.name]: e.target.value });

    if (e.target.name === 'Calificacion') {
      setCalificacion(Number(e.target.value));
    }
  };

  // Manejar cambios en el archivo
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Manejar cambios en el nombre del archivo
  const handleFileNameChange = (e) => {
    setFileName(e.target.value);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      console.log('Datos enviados:', record);
      console.log(
        'URL:',
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}`
      );

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
      if (error.response) {
        console.error('Respuesta del servidor:', error.response.data);
      }
      setError('Error actualizando el registro');
    }
  };

  // Manejar subida de archivos
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

      const filesResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUploadedFiles(filesResponse.data.files);
      setFile(null);
      setFileName('');
      setShowUploadForm(false);
    } catch (error) {
      console.error('Error subiendo el archivo:', error);
      setError('Error subiendo el archivo');
    }
  };

  // Manejar eliminación de archivos
  const handleFileDelete = async (fileId) => {
    if (
      window.confirm('¿Estás seguro de que deseas eliminar este archivo?')
    ) {
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

  // Estilos para el campo Estado
  const estadoStyle = {
    padding: '10px',
    borderRadius: '5px',
    color: '#fff',
    textAlign: 'center',
    marginBottom: '10px',
    backgroundColor:
      currentEstado?.label === 'En Formulación' ? '#28a745' : '#6c757d',
  };

  return (
    <div className="content-wrapper">
      {/* Modal para Cambiar Estado */}
      {showStatusModal && (
        <div
          className="modal fade show"
          style={{ display: 'block' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cambiar Estado</h5>
                <button
                  type="button"
                  className="close"
                  onClick={handleCloseStatusModal}
                >
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseStatusModal}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateStatus}
                >
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
              <div
                className={isPrimaryTable ? 'col-md-8' : 'col-md-12'}
              >
                <form onSubmit={handleSubmit}>
                  {fields.map((field) => (
                    <div
                      className="form-group"
                      key={field.column_name}
                    >
                      <label>{field.column_name}</label>

                      {/* Campo 'id' como solo lectura */}
                      {field.column_name === 'id' ? (
                        <input
                          type="text"
                          name={field.column_name}
                          value={record[field.column_name] || ''}
                          className="form-control"
                          readOnly
                        />
                      ) : field.column_name === 'Asesor' ? (
                        // Renderizar Asesor como lista desplegable
                        <select
                          className="form-control"
                          name={field.column_name}
                          value={record[field.column_name] || ''}
                          onChange={handleChange}
                        >
                          <option value="">-- Selecciona un Asesor --</option>
                          {asesors.map((asesor) => (
                            <option key={asesor.id} value={asesor.id}>
                              {asesor.username}
                            </option>
                          ))}
                        </select>
                      ) : relatedData[field.column_name] ? (
                        /* Si el campo tiene datos relacionados, mostrar un select */
                        <select
                          className="form-control"
                          name={field.column_name}
                          value={record[field.column_name] || ''}
                          onChange={handleChange}
                        >
                          <option value="">
                            -- Selecciona una opción --
                          </option>
                          {relatedData[field.column_name]?.map(
                            (relatedRecord) => (
                              <option
                                key={relatedRecord.id}
                                value={relatedRecord.id}
                              >
                                {relatedRecord.displayValue}
                              </option>
                            )
                          )}
                        </select>
                      ) : (
                        /* Campo de texto por defecto */
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
                      <div
                        style={{
                          width: 150,
                          marginBottom: '20px',
                        }}
                      >
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
                      <div className="knob-label mt-2">
                        Calificación
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Barra de progreso para 'Completado' */}
                      <div
                        style={{
                          width: 150,
                          marginBottom: '20px',
                        }}
                      >
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
                      <div className="knob-label mt-2">
                        Completado
                      </div>
                    </>
                  )}

                  {/* Mostrar el estado actual solo si el campo 'Estado' existe */}
                  {estadoFieldExists && (
                    <div
                      className="mt-4 text-center"
                      style={{ width: '100%' }}
                    >
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
                  <div
                    className="mt-4"
                    style={{ width: '100%' }}
                  >
                    <h5>Archivos adicionales</h5>
                    {!showUploadForm && (
                      <button
                        type="button"
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
                          <input
                            type="file"
                            className="form-control"
                            onChange={handleFileChange}
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-success btn-sm btn-block mb-2"
                        >
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
                                href={`http://localhost:4000${file.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver archivo
                              </a>
                            </div>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                handleFileDelete(file.id)
                              }
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



