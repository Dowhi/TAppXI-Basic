const fs = require('fs');
const path = 'screens/ResumenDiarioScreen.tsx';
let text = fs.readFileSync(path, 'utf8');
const startNeedle = "    return (\r\n        <div className=\"space-y-2\">";
const startIndex = text.indexOf(startNeedle);
if (startIndex === -1) {
    throw new Error('Inicio no encontrado');
}
const endNeedle = "\r\n    );\r\n};";
const endIndex = text.indexOf(endNeedle, startIndex);
if (endIndex === -1) {
    throw new Error('Final no encontrado');
}
const newReturn = String.raw    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 font-sans px-3 py-4 space-y-3">
            <header className="relative bg-yellow-400 rounded-lg px-3 py-1.5 flex items-center">
                <BackButton
                    navigateTo={navigateTo}
                    targetPage={Seccion.Resumen}
                    className="p-2 text-zinc-900 hover:text-zinc-700 transition-colors"
                />
                <h1 className="flex-1 text-center text-zinc-900 font-bold text-base">Resumen Diario</h1>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsDatePickerOpen((prev) => !prev)}
                        className="p-1.5 rounded-full bg-zinc-800 text-cyan-400 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        aria-label="Seleccionar fecha"
                    >
                        <CalendarIcon />
                    </button>
                </div>
                {isDatePickerOpen && (
                    <div
                        ref={datePickerRef}
                        className="absolute right-3 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg space-y-2 z-20"
                    >
                        <span className="block text-xs text-zinc-400 uppercase tracking-wide">Selecciona un día</span>
                        <input
                            type="date"
                            value={selectedDateISO}
                            onChange={(e) => {
                                if (!e.target.value) return;
                                setSelectedDate(new Date(e.target.value + 'T00:00:00'));
                                setIsDatePickerOpen(false);
                            }}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                )}
            </header>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2 text-sm">
                {loading ? (
                    <div className="text-cyan-300">Cargando resumen...</div>
                ) : (
                    <>
                        <div className="flex justify-between text-zinc-300">
                            <span>Fecha</span>
                            <span className="text-zinc-100 font-semibold">{formatDate(selectedDate)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-zinc-800/70 rounded-lg px-3 py-2">
                                <p className="text-xs text-zinc-400 uppercase tracking-wide">Turnos</p>
                                <p className="text-lg font-bold text-zinc-100">{turnosConEstadisticas.length}</p>
                            </div>
                            <div className="bg-zinc-800/70 rounded-lg px-3 py-2">
                                <p className="text-xs text-zinc-400 uppercase tracking-wide">Carreras</p>
                                <p className="text-lg font-bold text-zinc-100">{carreras.length}</p>
                            </div>
                            <div className="bg-zinc-800/70 rounded-lg px-3 py-2">
                                <p className="text-xs text-zinc-400 uppercase tracking-wide">Ingresos</p>
                                <p className="text-lg font-bold text-emerald-300">{totalDia.ingresos.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-800/70 rounded-lg px-3 py-2">
                                <p className="text-xs text-zinc-400 uppercase tracking-wide">Gastos</p>
                                <p className="text-lg font-bold text-rose-300">{totalDia.gastos.toFixed(2)}</p>
                            </div>
                            <div className="col-span-2 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
                                <p className="text-xs text-zinc-400 uppercase tracking-wide">Balance</p>
                                <p className={	ext-lg font-bold \}>{totalDia.balance.toFixed(2)}</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 px-3 flex items-center justify-between">
                <button
                    onClick={() => changeDate(-1)}
                    className="text-zinc-100 hover:bg-zinc-800 rounded p-1"
                >
                    <ArrowLeftIcon />
                </button>
                <span className="text-zinc-100 font-medium">{formatDate(selectedDate)}</span>
                <button
                    onClick={() => changeDate(1)}
                    className="text-zinc-100 hover:bg-zinc-800 rounded p-1"
                >
                    <ArrowRightIcon />
                </button>
            </div>

            {loading ? (
                <div className="text-center p-8 text-zinc-400">Cargando...</div>
            ) : (
                <>
                    {turnosConEstadisticas.map((turno) => (
                        <div key={turno.id} className="bg-blue-900 rounded-lg p-4 relative">
                            <div className="flex justify-center mb-2">
                                <div className="bg-white rounded px-3 py-1 border border-blue-900">
                                    <span className="text-blue-900 text-sm font-bold">Turno {turno.turnoIndex || 1}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-white text-sm">
                                <div className="flex justify-between">
                                    <span>Carreras:</span>
                                    <span className="font-semibold">{turno.carreras}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>C. Tarjeta:</span>
                                    <span className="font-semibold">{turno.cTarjeta}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>C. Emisora:</span>
                                    <span className="font-semibold">{turno.cEmisora}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Suma Tarjetas:</span>
                                    <span className="font-semibold">{turno.sumaTarjetas.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Suma Emisora:</span>
                                    <span className="font-semibold">{turno.sumaEmisora.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Km inicial:</span>
                                    <span className="font-semibold">{turno.kilometrosInicio}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Km final:</span>
                                    <span className="font-semibold">{turno.kilometrosFin || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hora Inicio:</span>
                                    <span className="font-semibold">{formatTime(turno.fechaInicio)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hora Fin:</span>
                                    <span className="font-semibold">{formatTime(turno.fechaFin)}</span>
                                </div>
                            </div>

                            <div className="mt-2 bg-white rounded border border-blue-900 p-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-900 font-bold">TOTAL</span>
                                    <span className="text-blue-900 font-bold">{turno.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {turnosConEstadisticas.length > 0 && (
                        <div className="bg-blue-900 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold">TOTAL DÍA</span>
                                <div className="flex gap-4">
                                    <span className="text-white font-semibold">{totalDia.ingresos.toFixed(2)}</span>
                                    <span className="text-red-300 font-semibold">{totalDia.gastos.toFixed(2)}</span>
                                    <span className="text-white font-semibold">{totalDia.balance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );;
const updated = text.slice(0, startIndex) + newReturn + text.slice(endIndex + endNeedle.length);
fs.writeFileSync(path, updated);
