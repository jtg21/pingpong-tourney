from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    players: Mapped[list["Player"]] = relationship(back_populates="team", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    team: Mapped["Team"] = relationship(back_populates="players")


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_a_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    team_b_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, active, done
    winner_side: Mapped[str | None] = mapped_column(String(1), nullable=True)  # a or b
    active_players_a: Mapped[list] = mapped_column(JSON, default=lambda: [0, 1])
    active_players_b: Mapped[list] = mapped_column(JSON, default=lambda: [0, 1])
    current_score_a: Mapped[int] = mapped_column(Integer, default=0)
    current_score_b: Mapped[int] = mapped_column(Integer, default=0)
    point_log: Mapped[list] = mapped_column(JSON, default=list)
    pending_swap: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    team_a: Mapped["Team"] = relationship(foreign_keys=[team_a_id])
    team_b: Mapped["Team"] = relationship(foreign_keys=[team_b_id])
    games: Mapped[list["Game"]] = relationship(back_populates="match", cascade="all, delete-orphan", order_by="Game.game_number")


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    game_number: Mapped[int] = mapped_column(Integer)
    winner_side: Mapped[str] = mapped_column(String(1))  # a or b
    score_a: Mapped[int] = mapped_column(Integer)
    score_b: Mapped[int] = mapped_column(Integer)
    players_a: Mapped[list] = mapped_column(JSON)
    players_b: Mapped[list] = mapped_column(JSON)

    match: Mapped["Match"] = relationship(back_populates="games")
