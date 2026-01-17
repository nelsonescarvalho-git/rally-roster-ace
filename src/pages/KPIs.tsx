import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, Target, Award, Loader2, Zap, Shield, Users, BarChart } from 'lucide-react';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function KPIs() {
  const { 
    loading, 
    summary, 
    topAttackers, 
    topReceivers, 
    topServers, 
    topBlockers, 
    topSetters, 
    teamDefenseStats,
    setterDistributionStats,
    globalReceptionBreakdown,
  } = useGlobalStats();

  if (loading) {
    return (
      <MainLayout title="KPIs">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const hasData = summary.totalMatches > 0;

  // Prepare chart data for reception breakdown
  const receptionChartData = globalReceptionBreakdown.map(r => ({
    name: `${r.emoji} ${r.receptionCode}`,
    Distribuições: r.totalRallies,
    'Pos. Disp.': r.availableCount,
  }));

  // Chart colors
  const CHART_COLORS = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <MainLayout title="KPIs">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Estatísticas globais agregadas de todos os jogos.
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Target className="mb-1 h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {hasData ? `${(summary.avgAttackEfficiency * 100).toFixed(0)}%` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">Efic. Ataque</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <TrendingUp className="mb-1 h-5 w-5 text-success" />
              <span className="text-2xl font-bold">
                {hasData ? `${summary.avgSideoutPercent.toFixed(0)}%` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">Side-Out</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Award className="mb-1 h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">
                {hasData ? summary.acesPerMatch.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">Aces/Jogo</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Shield className="mb-1 h-5 w-5 text-away" />
              <span className="text-2xl font-bold">
                {hasData ? summary.blocksPerMatch.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">Blocos/Jogo</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Users className="mb-1 h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {hasData && summary.avgPassQuality > 0 ? summary.avgPassQuality.toFixed(2) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">Média Qualidade Passe</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <BarChart className="mb-1 h-5 w-5 text-success" />
              <span className="text-2xl font-bold">
                {hasData && summary.avgDistributionWithinAvailable > 0 
                  ? `${summary.avgDistributionWithinAvailable.toFixed(0)}%` 
                  : '—'}
              </span>
              <span className="text-xs text-muted-foreground">% Dist. Dentro</span>
            </CardContent>
          </Card>
        </div>

        {/* Stats summary */}
        <Card>
          <CardContent className="py-3">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-xl font-bold">{summary.totalMatches}</p>
                <p className="text-xs text-muted-foreground">Jogos</p>
              </div>
              <div>
                <p className="text-xl font-bold">{summary.totalRallies}</p>
                <p className="text-xs text-muted-foreground">Pontos</p>
              </div>
              <div>
                <p className="text-xl font-bold">{summary.avgAvailablePositions.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Média Pos. Disp.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!hasData ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Sem dados</h3>
              <p className="text-sm text-muted-foreground">
                Registe jogos para ver os KPIs globais.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="attack" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="attack" className="text-xs">
                <Zap className="mr-1 h-3 w-3" />
                Ataque
              </TabsTrigger>
              <TabsTrigger value="defense-team" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Defesa
              </TabsTrigger>
              <TabsTrigger value="reception" className="text-xs">
                <TrendingUp className="mr-1 h-3 w-3" />
                Receção
              </TabsTrigger>
              <TabsTrigger value="serve" className="text-xs">
                <Award className="mr-1 h-3 w-3" />
                Serviço
              </TabsTrigger>
              <TabsTrigger value="block" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Bloco
              </TabsTrigger>
              <TabsTrigger value="setter" className="text-xs">
                <Users className="mr-1 h-3 w-3" />
                Setter
              </TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">
                <BarChart className="mr-1 h-3 w-3" />
                Distrib.
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attack" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Atacantes (Eficiência)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Att</TableHead>
                        <TableHead className="text-right">K</TableHead>
                        <TableHead className="text-right text-xs">Chão</TableHead>
                        <TableHead className="text-right text-xs">B.Out</TableHead>
                        <TableHead className="text-right">E</TableHead>
                        <TableHead className="text-right">Eff%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topAttackers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                            Dados insuficientes (min. 5 ataques)
                          </TableCell>
                        </TableRow>
                      ) : (
                        topAttackers.map((player, idx) => (
                          <TableRow key={player.playerId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  #{player.jerseyNumber} {player.playerName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {player.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{player.attAttempts}</TableCell>
                            <TableCell className="text-right text-success">{player.attPoints}</TableCell>
                            <TableCell className="text-right text-xs">{player.attFloorKills}</TableCell>
                            <TableCell className="text-right text-xs">{player.attBlockoutKills}</TableCell>
                            <TableCell className="text-right text-destructive">{player.attErrors}</TableCell>
                            <TableCell className="text-right font-bold">
                              {(player.attEfficiency * 100).toFixed(0)}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="defense-team" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Kills Sofridos por Equipa</CardTitle>
                  <p className="text-xs text-muted-foreground">Como cada equipa sofre ataques adversários</p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipa</TableHead>
                        <TableHead className="text-right">Kills</TableHead>
                        <TableHead className="text-right">Chão</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">B.Out</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamDefenseStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                            Sem dados de kills registados
                          </TableCell>
                        </TableRow>
                      ) : (
                        teamDefenseStats.map((team) => (
                          <TableRow key={team.teamName}>
                            <TableCell className="font-medium">{team.teamName}</TableCell>
                            <TableCell className="text-right">{team.killsSuffered}</TableCell>
                            <TableCell className="text-right">{team.floorKillsSuffered}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {team.floorPct.toFixed(0)}%
                            </TableCell>
                            <TableCell className="text-right">{team.blockoutKillsSuffered}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {team.blockoutPct.toFixed(0)}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reception" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Recetores (Média)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Rec</TableHead>
                        <TableHead className="text-right">+</TableHead>
                        <TableHead className="text-right">-</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topReceivers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                            Dados insuficientes (min. 5 receções)
                          </TableCell>
                        </TableRow>
                      ) : (
                        topReceivers.map((player, idx) => (
                          <TableRow key={player.playerId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  #{player.jerseyNumber} {player.playerName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {player.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{player.recAttempts}</TableCell>
                            <TableCell className="text-right text-success">{player.recPoints}</TableCell>
                            <TableCell className="text-right text-destructive">{player.recErrors}</TableCell>
                            <TableCell className="text-right font-bold">
                              {player.recAvg.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="serve" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Servidores (Média)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Srv</TableHead>
                        <TableHead className="text-right">Aces</TableHead>
                        <TableHead className="text-right">Err</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topServers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                            Dados insuficientes (min. 5 serviços)
                          </TableCell>
                        </TableRow>
                      ) : (
                        topServers.map((player, idx) => (
                          <TableRow key={player.playerId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  #{player.jerseyNumber} {player.playerName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {player.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{player.serveAttempts}</TableCell>
                            <TableCell className="text-right text-success">{player.servePoints}</TableCell>
                            <TableCell className="text-right text-destructive">{player.serveErrors}</TableCell>
                            <TableCell className="text-right font-bold">
                              {player.serveAvg.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="block" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Bloqueadores (Pontos)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Blk</TableHead>
                        <TableHead className="text-right">Pts</TableHead>
                        <TableHead className="text-right">Err</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topBlockers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            Dados insuficientes (min. 3 blocos)
                          </TableCell>
                        </TableRow>
                      ) : (
                        topBlockers.map((player, idx) => (
                          <TableRow key={player.playerId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  #{player.jerseyNumber} {player.playerName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {player.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{player.blkAttempts}</TableCell>
                            <TableCell className="text-right text-success">{player.blkPoints}</TableCell>
                            <TableCell className="text-right text-destructive">{player.blkErrors}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="setter" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Setters (Qualidade de Passe)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Passes</TableHead>
                        <TableHead className="text-right">Média</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSetters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            Dados insuficientes (min. 3 passes registados)
                          </TableCell>
                        </TableRow>
                      ) : (
                        topSetters.map((setter, idx) => (
                          <TableRow key={setter.playerId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  #{setter.jerseyNumber} {setter.playerName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {setter.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{setter.totalPasses}</TableCell>
                            <TableCell className="text-right font-bold">
                              {setter.passAvg.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution" className="mt-4 space-y-4">
              {/* Reception breakdown chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuições por Qualidade de Receção</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Total de distribuições agrupadas pela qualidade da receção
                  </p>
                </CardHeader>
                <CardContent>
                  {globalReceptionBreakdown.some(r => r.totalRallies > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsBarChart data={receptionChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="Distribuições" radius={[4, 4, 0, 0]}>
                          {receptionChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Sem dados de distribuição
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reception breakdown table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detalhes por Qualidade de Receção</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receção</TableHead>
                        <TableHead className="text-center">Pos. Disp.</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Destinos Mais Usados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalReceptionBreakdown.map(row => (
                        <TableRow key={row.receptionCode} className={row.totalRallies === 0 ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">
                            <span className="mr-1">{row.emoji}</span>
                            {row.receptionCode} - {row.qualityLabel}
                          </TableCell>
                          <TableCell className="text-center font-semibold">{row.availableCount}</TableCell>
                          <TableCell className="text-center">{row.totalRallies}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.topDestinations}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Top setters by distribution efficiency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Setters (% Distribuição Dentro das Opções)</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Setters ordenados pela percentagem de distribuições dentro das posições disponíveis
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Dist.</TableHead>
                        <TableHead className="text-right">Média Pos.</TableHead>
                        <TableHead className="text-right">% Dentro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {setterDistributionStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            Dados insuficientes (min. 5 distribuições)
                          </TableCell>
                        </TableRow>
                      ) : (
                        setterDistributionStats.slice(0, 10).map((setter, idx) => (
                          <TableRow key={setter.playerId}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  #{setter.jerseyNumber} {setter.playerName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {setter.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{setter.totalDistributions}</TableCell>
                            <TableCell className="text-right">{setter.avgAvailablePositions.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-bold text-success">
                              {setter.usedWithinAvailable.toFixed(0)}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
