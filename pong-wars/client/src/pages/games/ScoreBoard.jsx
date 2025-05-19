import React from 'react';

function ScoreBoard({ scores, player, opponent }) {
    // スコアが存在しない場合のフォールバック
    if (!scores) {
        return (
            <div className="">
                <div className="text-center">
                    <p className="font-bold">あなた</p>
                    <p className="text-2xl">0</p>
                </div>
                <div className="">-</div>
                <div className="text-center">
                    <p className="font-bold">対戦相手</p>
                    <p className="text-2xl">0</p>
                </div>
            </div>
        );
    }

    return (
        <div className="">
            <div className="text-center">
                <p className="font-bold">あなた</p>
                <p className="text-2xl">{scores[player] || 0}</p>
            </div>
            <div className="text-4xl font-light">-</div>
            <div className="text-center">
                <p className="">対戦相手</p>
                <p className="text-2xl">{scores[opponent] || 0}</p>
            </div>
        </div>
    );
}

export default ScoreBoard;