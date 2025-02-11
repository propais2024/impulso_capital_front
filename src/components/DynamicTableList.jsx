// DynamicTableList.jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css'; // Asegúrate de ajustar la ruta si es necesario

export default function DynamicTableList() {
  // Estados y variables
  const [tables, setTables] = useState([]); 
  const [selectedTable, setSelectedTable] = useState(''); 
  const [isPrimaryTable, setIsPrimaryTable] = useState(false); 
  const [records, setRecords] = useState([]); 
  const [columns, setColumns] = useState([]); 
  const [fieldsData, setFieldsData] = useState([]); 
  const [visibleColumns, setVisibleColumns] = useState([]); 
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null); 
  const [search, setSearch] = useState(''); 
  const [showSearchBar, setShowSearchBar] = useState(false); 

  const [selectedRecords, setSelectedRecords] = useState([]); 
  const [multiSelectFields, setMultiSelectFields] = useState([]); 
  const [bulkUpdateData, setBulkUpdateData] = useState({}); 
  const [fieldOptions, setFieldOptions] = useState({}); 
  const [fieldOptionsLoaded, setFieldOptionsLoaded] = useState(false); 
  const [relatedData, setRelatedData] = useState({}); 

  const [currentPage, setCurrentPage] = useState(1); 
  const recordsPerPage = 100; 

  const navigate = useNavigate();

  // Claves únicas
  const LOCAL_STORAGE_TABLE_KEY = 'dynamicSelectedTable'; 
  const LOCAL_STORAGE_COLUMNS_KEY = 'dynamicVisibleColumns'; 
  const LOCAL_STORAGE_SEARCH_KEY = 'dynamicSearchQuery'; 

  const selectRef = useRef(null);

  // Funciones para ID y rol de usuario
  const getLoggedUserId = () => localStorage.getItem('id') || null;
  const getLoggedUserRoleId = () => localStorage.getItem('role_id') || null;

  // Función para obtener columnas y registros de la tabla seleccionada
  const fetchTableData = async (tableName, savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const loggedUserId = getLoggedUserId();
      const loggedUserRoleId = getLoggedUserRoleId();

      // Obtener campos
      const fieldsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const fetchedColumns = fieldsResponse.data.map((column) => column.column_name);
      setColumns(fetchedColumns);
      setFieldsData(fieldsResponse.data);

      // Identificar llaves foráneas
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);
      setMultiSelectFields(multiSelectFieldsArray);

      // Establecer columnas visibles
      const localVisibleColumns =
        savedVisibleColumns ||
        JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)) ||
        [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns);
      }

      // Obtener registros
      const recordsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      let filteredRecords = recordsResponse.data;

      // FILTRAR SEGÚN ROL PARA "inscription_caracterizacion"
      if (tableName === 'inscription_caracterizacion') {
        // <-- CAMBIO: exclude role 5 from the filter
        if (
          loggedUserRoleId !== '1' &&
          loggedUserRoleId !== '2' &&
          loggedUserRoleId !== '5' && // <-- excluimos 5 del filtrado
          loggedUserId
        ) {
          filteredRecords = filteredRecords.filter(
            (record) => String(record.Asesor) === String(loggedUserId)
          );
        }
      }

      setRecords(filteredRecords);

      // Obtener datos relacionados
      const relatedDataResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/related-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRelatedData(relatedDataResponse.data.relatedData || {});
      setLoading(false);
      setFieldOptionsLoaded(true);
    } catch (error) {
      console.error('Error obteniendo los registros:', error);
      setError('Error obteniendo los registros');
      setLoading(false);
    }
  };

  // Cargar tablas y filtros guardados
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'https://impulso-capital-back.onrender.com/api/inscriptions/tables',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setTables(response.data || []);

        // Cargar tabla seleccionada y columnas visibles
        const savedTable = localStorage.getItem(LOCAL_STORAGE_TABLE_KEY);
        const savedVisibleColumns = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)
        );

        if (savedTable) {
          setSelectedTable(savedTable);
          const selectedTableObj = response.data.find(
            (table) => table.table_name === savedTable
          );
          setIsPrimaryTable(selectedTableObj?.is_primary || false);
          fetchTableData(savedTable, savedVisibleColumns);
        }
      } catch (error) {
        console.error('Error obteniendo las tablas:', error);
        setError('Error obteniendo las tablas');
      }
    };

    fetchTables();
  }, []);

  // Manejar Select2
  useEffect(() => {
    if (window.$ && selectedTable && selectRef.current) {
      const $select = window.$(selectRef.current);

      // Inicializar Select2
      $select.select2({
        closeOnSelect: false,
        theme: 'bootstrap4',
        width: '100%',
      });

      $select.off('change').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );
        if (selectedOptions.length === 0 && columns.length > 0) {
          const firstColumn = columns[0];
          $select.val([firstColumn]).trigger('change');
          setVisibleColumns([firstColumn]);
          localStorage.setItem(
            LOCAL_STORAGE_COLUMNS_KEY,
            JSON.stringify([firstColumn])
          );
          return;
        }
        setVisibleColumns(selectedOptions);
        localStorage.setItem(
          LOCAL_STORAGE_COLUMNS_KEY,
          JSON.stringify(selectedOptions)
        );
      });

      // Cargar columnas visibles
      const savedVisibleColumns = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)
      );
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        $select.val(savedVisibleColumns).trigger('change');
      } else if (columns.length > 0) {
        $select.val([columns[0]]).trigger('change');
      }

      return () => {
        if ($select.hasClass('select2-hidden-accessible')) {
          $select.select2('destroy');
        }
      };
    }

    // Búsqueda persistente
    const savedSearch = localStorage.getItem(LOCAL_STORAGE_SEARCH_KEY);
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns, selectedTable]);

  // Manejar selección de tabla
  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    localStorage.setItem(LOCAL_STORAGE_TABLE_KEY, tableName);
    setCurrentPage(1);

    if (tableName) {
      const selectedTableObj = tables.find(
        (table) => table.table_name === tableName
      );
      setIsPrimaryTable(selectedTableObj?.is_primary || false);

      const savedVisibleColumns = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)
      );
      fetchTableData(tableName, savedVisibleColumns);
    } else {
      setRecords([]);
      setIsPrimaryTable(false);
      setVisibleColumns([]);
    }
  };

  // Mostrar valor en celdas
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
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

  // Filtrar por búsqueda
  const filteredRecords = search
    ? records.filter((record) =>
        visibleColumns.some((column) =>
          getColumnDisplayValue(record, column)
            ?.toString()
            ?.toLowerCase()
            .includes(search.toLowerCase())
        )
      )
    : records;

  // Resetear la página al cambiar búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [search, records]);

  // Paginación
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  // Limpiar filtros
  const clearFilters = () => {
    setVisibleColumns(columns);
    setSearch('');
    localStorage.removeItem(LOCAL_STORAGE_COLUMNS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_SEARCH_KEY);
    setCurrentPage(1);
    fetchTableData(selectedTable);
  };

  // Manejar cambios en búsqueda
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    localStorage.setItem(LOCAL_STORAGE_SEARCH_KEY, e.target.value);
    setCurrentPage(1);
  };

  // Checkboxes de selección
  const handleCheckboxChange = (recordId) => {
    setSelectedRecords((prevSelected) => {
      if (prevSelected.includes(recordId)) {
        return prevSelected.filter((id) => id !== recordId);
      } else {
        return [...prevSelected, recordId];
      }
    });
  };

  // Seleccionar todos los registros en la página actual
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allRecordIds = currentRecords.map((record) => record.id);
      setSelectedRecords(allRecordIds);
    } else {
      setSelectedRecords([]);
    }
  };

  // Actualización masiva
  const handleBulkUpdateChange = (field, value) => {
    setBulkUpdateData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const applyBulkUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${selectedTable}/bulk-update`,
        {
          recordIds: selectedRecords,
          updates: bulkUpdateData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert('Registros actualizados con éxito');
      // Recargar registros
      fetchTableData(selectedTable);
      setSelectedRecords([]);
      setBulkUpdateData({});
    } catch (error) {
      console.error('Error actualizando los registros:', error);
      setError('Error actualizando los registros');
    }
  };

  return (
    <div className="content-wrapper">
      {/* Cabecera */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Gestionar Tablas Dinámicas</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-light mr-2"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                {showSearchBar ? "Ocultar búsqueda" : "Mostrar búsqueda"}
              </button>
              <select
                id="tableSelect"
                className="form-control"
                value={selectedTable}
                onChange={handleTableSelect}
                style={{ maxWidth: "250px" }}
              >
                <option value="">-- Selecciona una tabla --</option>
                {tables.length > 0 &&
                  tables.map((table) => (
                    <option key={table.table_name} value={table.table_name}>
                      {table.table_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="content">
        <div className="container-fluid">
          {/* Error */}
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card">
            <div className="card-body table-responsive p-0">
              {/* Barra de búsqueda */}
              {showSearchBar && (
                <div className="row mb-3">
                  <div className="col-sm-6">
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control search-input"
                        placeholder="Buscar en columnas visibles..."
                        value={search}
                        onChange={handleSearchChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Select de columnas: visible solo para rol 1 */}
              {getLoggedUserRoleId() === "1" && columns.length > 0 && (
                <div className="form-group mb-3">
                  <label>Selecciona las columnas a mostrar:</label>
                  <select
                    ref={selectRef}
                    className="select2 form-control"
                    multiple="multiple"
                    style={{ width: "100%" }}
                  >
                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tabla */}
              {loading ? (
                <div className="d-flex justify-content-center p-3">
                  Cargando...
                </div>
              ) : (
                <>
                  <table className="table table-hover text-nowrap minimal-table">
                    <thead>
                      <tr>
                        {isPrimaryTable && (
                          <th>
                            <input
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={
                                selectedRecords.length ===
                                  currentRecords.length &&
                                currentRecords.length > 0
                              }
                            />
                          </th>
                        )}
                        {visibleColumns.length > 0 &&
                          visibleColumns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.length > 0 ? (
                        currentRecords.map((record) => (
                          <tr key={record.id}>
                            {isPrimaryTable && (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedRecords.includes(record.id)}
                                  onChange={() => handleCheckboxChange(record.id)}
                                />
                              </td>
                            )}

                            {visibleColumns.length > 0 ? (
                              visibleColumns.map((column) => (
                                <td key={column}>
                                  {getColumnDisplayValue(record, column)}
                                </td>
                              ))
                            ) : (
                              <td
                                colSpan={
                                  isPrimaryTable
                                    ? columns.length + 2
                                    : columns.length + 1
                                }
                                className="text-center"
                              >
                                No hay columnas seleccionadas para mostrar.
                              </td>
                            )}

                            <td>
                              {/* <-- CAMBIO: Deshabilitar si rol=5 */}
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={getLoggedUserRoleId() === '5'}
                                onClick={() => {
                                  if (getLoggedUserRoleId() === '5') {
                                    alert('No tienes permisos para editar.');
                                    return;
                                  }
                                  navigate(`/table/${selectedTable}/record/${record.id}`);
                                }}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={
                              isPrimaryTable
                                ? visibleColumns.length + 2
                                : visibleColumns.length + 1
                            }
                            className="text-center"
                          >
                            No hay registros para mostrar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="pagination mt-3 d-flex justify-content-center">
                      <button
                        className="btn btn-light mr-2"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                        (number) => (
                          <button
                            key={number}
                            onClick={() => setCurrentPage(number)}
                            className={`btn btn-light mr-2 ${
                              number === currentPage ? "active" : ""
                            }`}
                          >
                            {number}
                          </button>
                        )
                      )}
                      <button
                        className="btn btn-light"
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Actualización masiva */}
              {isPrimaryTable && selectedRecords.length > 0 && (
                <div className="bulk-update-section mt-3 p-3 bg-light">
                  <h4>Actualizar campos seleccionados</h4>
                  {multiSelectFields.map((field) => (
                    <div key={field} className="form-group">
                      <label>{field}</label>
                      <select
                        className="form-control"
                        value={bulkUpdateData[field] || ""}
                        onChange={(e) =>
                          handleBulkUpdateChange(field, e.target.value)
                        }
                      >
                        <option value="">-- Selecciona una opción --</option>
                        {relatedData[field]?.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.displayValue || `ID: ${option.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <button className="btn btn-primary" onClick={applyBulkUpdate}>
                    Aplicar cambios
                  </button>
                </div>
              )}

              {/* Botón limpiar */}
              <div className="mt-3">
                <button className="btn btn-secondary" onClick={clearFilters}>
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








