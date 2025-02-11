// PiTableList.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function PiTableList() {
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fieldsData, setFieldsData] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [multiSelectFields, setMultiSelectFields] = useState([]);
  const [relatedData, setRelatedData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 100;

  const navigate = useNavigate();
  const tableName = 'inscription_caracterizacion';

  // Función para obtener el ID del usuario logueado desde el localStorage
  const getLoggedUserId = () => {
    return localStorage.getItem('id') || null;
  };

  // Función para obtener el role_id del usuario logueado desde el localStorage
  const getLoggedUserRoleId = () => {
    return localStorage.getItem('role_id') || null;
  };

  // Función para obtener columnas, registros y datos relacionados de la tabla
  const fetchTableData = async (savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Obtener el ID y el role_id del usuario logueado
      const loggedUserId = getLoggedUserId();
      const loggedUserRoleId = getLoggedUserRoleId();

      // Obtener campos de la tabla
      const fieldsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const fetchedColumns = fieldsResponse.data.map((column) => column.column_name);
      setColumns(fetchedColumns);
      setFieldsData(fieldsResponse.data);

      // Identificar claves foráneas
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);
      setMultiSelectFields(multiSelectFieldsArray);

      // Establecer columnas visibles
      const localVisibleColumns =
        savedVisibleColumns || JSON.parse(localStorage.getItem('visibleColumns')) || [];
      setVisibleColumns(localVisibleColumns.length > 0 ? localVisibleColumns : fetchedColumns);

      // Obtener registros de la tabla
      const recordsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/caracterizacion/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let filteredRecords = recordsResponse.data;

      // Filtrar los registros según el rol y el usuario
      if (
        loggedUserRoleId !== '1' &&
        loggedUserRoleId !== '2' &&
        loggedUserRoleId !== '5' &&  // <-- EXCLUIMOS al rol 5 del filtrado
        loggedUserId
      ) {
        filteredRecords = filteredRecords.filter(
          (record) => String(record.Asesor) === String(loggedUserId)
        );
      }

      setRecords(filteredRecords);

      // Obtener datos relacionados para llaves foráneas
      const relatedDataResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/related-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRelatedData(relatedDataResponse.data.relatedData || {});
      setLoading(false);
    } catch (error) {
      console.error('Error obteniendo los registros:', error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Error obteniendo los registros');
      }
      setLoading(false);
    }
  };

  // Cargar los datos al montar
  useEffect(() => {
    fetchTableData();
  }, [navigate]);

  // Manejar Select2 con persistencia
  useEffect(() => {
    if (window.$) {
      window.$('.select2').select2({
        closeOnSelect: false,
        width: '100%',
      });

      window.$('.select2').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );
        setVisibleColumns(selectedOptions);
        localStorage.setItem('visibleColumns', JSON.stringify(selectedOptions));
      });

      const savedVisibleColumns = JSON.parse(localStorage.getItem('visibleColumns'));
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        window.$('.select2').val(savedVisibleColumns).trigger('change');
      }
    }

    const savedSearch = localStorage.getItem('searchQuery');
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns]);

  // Función para obtener el valor a mostrar en una columna
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
      // Es un campo de llave foránea
      const foreignKeyValue = record[column];
      if (relatedData[column]) {
        const relatedRecord = relatedData[column].find(
          (item) => String(item.id) === String(foreignKeyValue)
        );
        if (relatedRecord) {
          return relatedRecord.displayValue || `ID: ${relatedRecord.id}`;
        } else {
          return `ID: ${foreignKeyValue}`;
        }
      } else {
        return `ID: ${foreignKeyValue}`;
      }
    } else {
      return record[column];
    }
  };

  // Lógica de paginación y filtrado
  const filteredRecords = search
    ? records.filter((record) =>
        visibleColumns.some((column) =>
          getColumnDisplayValue(record, column)
            ?.toString()
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      )
    : records;

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Plan de Inversión</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-light mr-2"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                {showSearchBar ? 'Ocultar búsqueda' : 'Mostrar búsqueda'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="card">
            <div className="card-body table-responsive p-0">
              {showSearchBar && (
                <div className="row mb-3">
                  <div className="col-sm-6">
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control search-input"
                        placeholder="Buscar en columnas visibles..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          localStorage.setItem('searchQuery', e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {columns.length > 0 && (
                <div className="form-group mb-3">
                  <label>Selecciona las columnas a mostrar:</label>
                  <select className="select2" multiple="multiple" style={{ width: '100%' }}>
                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loading ? (
                <div className="d-flex justify-content-center p-3">Cargando...</div>
              ) : (
                <table className="table table-hover text-nowrap minimal-table">
                  <thead>
                    <tr>
                      {visibleColumns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.length > 0 ? (
                      currentRecords.map((record) => (
                        <tr key={record.id}>
                          {visibleColumns.map((column) => (
                            <td key={column}>{getColumnDisplayValue(record, column)}</td>
                          ))}
                          <td>
                            <button
                              className="btn btn-sm btn-primary mb-1"
                              onClick={() => navigate(`/plan-inversion/${record.id}`)}
                            >
                              Plan de Inversión
                            </button>
                            <br />
                            {/* // <-- CAMBIO: Deshabilitar si role_id=5 */}
                            <button
                              className="btn btn-sm btn-secondary"
                              disabled={getLoggedUserRoleId() === '5'}
                              onClick={() => {
                                if (getLoggedUserRoleId() === '5') {
                                  alert('No tienes permisos para editar.');
                                  return;
                                }
                                navigate(`/table/${tableName}/record/${record.id}`);
                              }}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="text-center">
                          No hay registros para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {totalPages > 1 && (
                <div className="pagination mt-3 d-flex justify-content-center">
                  <button
                    className="btn btn-light mr-2"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                    <button
                      key={number}
                      onClick={() => setCurrentPage(number)}
                      className={`btn btn-light mr-2 ${number === currentPage ? 'active' : ''}`}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    className="btn btn-light"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}

              <div className="mt-3">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setVisibleColumns(columns);
                    setSearch('');
                    localStorage.removeItem('visibleColumns');
                    localStorage.removeItem('searchQuery');
                    setCurrentPage(1);
                    fetchTableData();
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

