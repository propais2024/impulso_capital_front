// DynamicTableList.jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css'; // Asegúrate de ajustar la ruta si es necesario

export default function DynamicTableList() {
  // Estados y variables
  const [tables, setTables] = useState([]); // Tablas disponibles
  const [selectedTable, setSelectedTable] = useState(''); // Tabla seleccionada
  const [isPrimaryTable, setIsPrimaryTable] = useState(false); // Si la tabla es principal
  const [records, setRecords] = useState([]); // Registros de la tabla
  const [columns, setColumns] = useState([]); // Columnas de la tabla
  const [fieldsData, setFieldsData] = useState([]); // Información completa de los campos
  const [visibleColumns, setVisibleColumns] = useState([]); // Columnas a mostrar
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Estado de error
  const [search, setSearch] = useState(''); // Búsqueda
  const [showSearchBar, setShowSearchBar] = useState(false); // Mostrar barra de búsqueda

  const [selectedRecords, setSelectedRecords] = useState([]); // Registros seleccionados
  const [multiSelectFields, setMultiSelectFields] = useState([]); // Campos de llave foránea
  const [bulkUpdateData, setBulkUpdateData] = useState({}); // Datos para actualización masiva
  const [fieldOptions, setFieldOptions] = useState({}); // Opciones para campos de llave foránea
  const [fieldOptionsLoaded, setFieldOptionsLoaded] = useState(false); // Estado de carga de opciones
  const [relatedData, setRelatedData] = useState({}); // Datos relacionados para claves foráneas

  const [currentPage, setCurrentPage] = useState(1); // Página actual
  const recordsPerPage = 100; // Número de registros por página

  const navigate = useNavigate();

  // Claves únicas para evitar conflictos entre módulos
  const LOCAL_STORAGE_TABLE_KEY = 'dynamicSelectedTable'; // Clave única para tablas en dynamic
  const LOCAL_STORAGE_COLUMNS_KEY = 'dynamicVisibleColumns'; // Clave única para columnas visibles
  const LOCAL_STORAGE_SEARCH_KEY = 'dynamicSearchQuery'; // Clave única para búsqueda

  // Referencia para el select de columnas
  const selectRef = useRef(null);

  // Función para obtener el ID del usuario logueado desde el localStorage
  const getLoggedUserId = () => {
    return localStorage.getItem('id') || null;
  };

  // Función para obtener el role_id del usuario logueado desde el localStorage
  const getLoggedUserRoleId = () => {
    return localStorage.getItem('role_id') || null;
  };

  // Función para obtener columnas y registros de la tabla seleccionada
  const fetchTableData = async (tableName, savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const loggedUserId = getLoggedUserId();
      const loggedUserRoleId = getLoggedUserRoleId();

      // Obtener campos con información completa
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
      setFieldsData(fieldsResponse.data); // Guardar información completa de los campos

      // Identificar campos de selección múltiple (llaves foráneas)
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);

      setMultiSelectFields(multiSelectFieldsArray);

      // Si hay columnas visibles guardadas en localStorage, úsalas; si no, muestra todas las columnas por defecto
      const localVisibleColumns =
        savedVisibleColumns || JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)) || [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns); // Mostrar todas las columnas por defecto
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

      // Filtrar los registros según el rol y el usuario
      if (tableName === 'inscription_caracterizacion') {
        if (loggedUserRoleId !== '1' && loggedUserRoleId !== '2' && loggedUserId) {
          // Usuario NO es SuperAdmin y está logueado
          filteredRecords = filteredRecords.filter(
            (record) => String(record.Asesor) === String(loggedUserId)
          );
        }
        // Si el usuario es 'SuperAdmin' (role_id '1'), no se aplica el filtro y se muestran todos los registros
      }

      setRecords(filteredRecords);

      // Obtener datos relacionados para claves foráneas
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

  // Cargar las tablas y los filtros guardados desde el localStorage al montar
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://impulso-capital-back.onrender.com/api/inscriptions/tables', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setTables(response.data || []); // Asegurar que `tables` es un array

        // Cargar la tabla seleccionada y las columnas visibles guardadas desde el localStorage
        const savedTable = localStorage.getItem(LOCAL_STORAGE_TABLE_KEY);
        const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));

        if (savedTable) {
          setSelectedTable(savedTable);

          const selectedTableObj = response.data.find(
            (table) => table.table_name === savedTable
          );
          setIsPrimaryTable(selectedTableObj?.is_primary || false); // Actualizar estado

          fetchTableData(savedTable, savedVisibleColumns);
        }
      } catch (error) {
        console.error('Error obteniendo las tablas:', error);
        setError('Error obteniendo las tablas');
      }
    };

    fetchTables();
  }, []);

  // Manejar Select2 con persistencia
  useEffect(() => {
    if (window.$ && selectedTable && selectRef.current) {
      const $select = window.$(selectRef.current);

      // Inicializar Select2
      $select.select2({
        closeOnSelect: false, // No cerrar al seleccionar
        theme: 'bootstrap4', // Usar el tema de Bootstrap 4
        width: '100%',
      });

      // Remover manejadores previos para evitar duplicidades
      $select.off('change').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );

        if (selectedOptions.length === 0 && columns.length > 0) {
          // Seleccionar automáticamente la primera columna
          const firstColumn = columns[0];
          $select.val([firstColumn]).trigger('change');
          setVisibleColumns([firstColumn]);
          localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify([firstColumn]));
          return;
        }

        setVisibleColumns(selectedOptions);
        localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify(selectedOptions));
      });

      // Cargar las columnas visibles guardadas desde el localStorage
      const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        $select.val(savedVisibleColumns).trigger('change');
      } else if (columns.length > 0) {
        // Seleccionar la primera columna por defecto si no hay selecciones guardadas
        $select.val([columns[0]]).trigger('change');
      }

      // Cleanup al desmontar o cambiar de tabla
      return () => {
        if ($select.hasClass('select2-hidden-accessible')) {
          $select.select2('destroy');
        }
      };
    }

    // Cargar la búsqueda persistente
    const savedSearch = localStorage.getItem(LOCAL_STORAGE_SEARCH_KEY);
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns, selectedTable]); // Eliminar visibleColumns de las dependencias

  // Manejar la selección de tabla
  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    localStorage.setItem(LOCAL_STORAGE_TABLE_KEY, tableName); // Guardar tabla seleccionada en el localStorage
    setCurrentPage(1); // Resetear la página actual

    if (tableName) {
      const selectedTableObj = tables.find((table) => table.table_name === tableName);
      setIsPrimaryTable(selectedTableObj?.is_primary || false); // Actualizar estado

      const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));
      fetchTableData(tableName, savedVisibleColumns); // Cargar columnas y registros de la tabla seleccionada
    } else {
      setRecords([]); // Limpiar los registros si no se selecciona ninguna tabla
      setIsPrimaryTable(false);
      setVisibleColumns([]);
    }
  };

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

  // Aplicar el filtro de búsqueda
  const filteredRecords = search
    ? records.filter((record) => {
        return visibleColumns.some((column) => {
          const value = getColumnDisplayValue(record, column);
          return value?.toString()?.toLowerCase().includes(search.toLowerCase());
        });
      })
    : records;

  // Resetear la página actual cuando cambian los registros filtrados o la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [search, records]);

  // Paginación
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  // Función para limpiar filtros y mostrar todos los registros
  const clearFilters = () => {
    setVisibleColumns(columns); // Mostrar todas las columnas disponibles
    setSearch(''); // Limpiar búsqueda
    localStorage.removeItem(LOCAL_STORAGE_COLUMNS_KEY); // Limpiar filtros persistentes
    localStorage.removeItem(LOCAL_STORAGE_SEARCH_KEY); // Limpiar búsqueda persistente
    setCurrentPage(1); // Resetear la página actual

    // Volver a cargar todos los registros de la tabla seleccionada
    fetchTableData(selectedTable); // Restablecer la tabla completa sin filtros
  };

  // Manejar el cambio en la búsqueda
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    localStorage.setItem(LOCAL_STORAGE_SEARCH_KEY, e.target.value); // Guardar búsqueda en el localStorage
    setCurrentPage(1); // Resetear la página actual
  };

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (recordId) => {
    setSelectedRecords((prevSelected) => {
      if (prevSelected.includes(recordId)) {
        return prevSelected.filter((id) => id !== recordId);
      } else {
        return [...prevSelected, recordId];
      }
    });
  };

  // Manejar selección de todos los registros
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allRecordIds = currentRecords.map((record) => record.id);
      setSelectedRecords(allRecordIds);
    } else {
      setSelectedRecords([]);
    }
  };

  // Manejar cambios en los campos de actualización masiva
  const handleBulkUpdateChange = (field, value) => {
    setBulkUpdateData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // Aplicar actualización masiva
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
      // Recargar los registros después de la actualización
      fetchTableData(selectedTable);
      // Limpiar la selección
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
          {/* Mostrar errores */}
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

              {/* Select de columnas: visible solo para role_id === 1 */}
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

              {/* Tabla de registros */}
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
                                  onChange={() =>
                                    handleCheckboxChange(record.id)
                                  }
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
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() =>
                                  navigate(
                                    `/table/${selectedTable}/record/${record.id}`
                                  )
                                }
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
                      {Array.from(
                        { length: totalPages },
                        (_, index) => index + 1
                      ).map((number) => (
                        <button
                          key={number}
                          onClick={() => setCurrentPage(number)}
                          className={`btn btn-light mr-2 ${
                            number === currentPage ? "active" : ""
                          }`}
                        >
                          {number}
                        </button>
                      ))}
                      <button
                        className="btn btn-light"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Sección de actualización masiva */}
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

              {/* Botón para limpiar filtros */}
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








